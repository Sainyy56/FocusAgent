require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3210;
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const REMINDER_MINUTES = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '30', 10);
const TASKS_FILE = path.join(__dirname, 'tasks.json');

if (!API_KEY) {
  console.warn('\n⚠️  No GEMINI_API_KEY found. Copy .env.example to .env and add your key.\n');
}

// ---------- Gemini API helper ----------

async function callGemini(systemPrompt, userMsg, maxTokens = 1000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { maxOutputTokens: maxTokens }
    })
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text (possibly blocked or empty response).');
  return text;
}

// ---------- Task storage (shared between the web UI and the background reminder) ----------

function readTasks() {
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

app.get('/api/tasks', (req, res) => {
  res.json(readTasks());
});

app.post('/api/tasks', (req, res) => {
  const tasks = req.body;
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'Expected an array of tasks' });
  writeTasks(tasks);
  res.json({ ok: true });
});

// ---------- Gemini API proxy (keeps the key server-side, out of the browser) ----------

app.post('/api/chat', async (req, res) => {
  const { system, message } = req.body;
  if (!API_KEY) return res.status(500).json({ error: 'Server has no GEMINI_API_KEY configured.' });
  try {
    const text = await callGemini(system, message, 1000);
    res.json({ text });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------- Native macOS notifications ----------

function nativeNotify(title, body) {
  // osascript ships with macOS, no extra install needed.
  const script = `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)} sound name "Glass"`;
  execFile('osascript', ['-e', script], (err) => {
    if (err) console.error('Notification failed (are you on macOS?):', err.message);
  });
}

// ---------- Background reminder loop: runs independent of any browser tab ----------

async function checkAndRemind() {
  const tasks = readTasks();
  const pending = tasks.filter(t => !t.done);
  if (!pending.length) return;

  const summary = pending.map(t => `(${t.priority}) ${t.text}`).join(', ');
  let body = `You still have ${pending.length} task${pending.length > 1 ? 's' : ''} left: ${pending[0].text}`;

  if (API_KEY) {
    try {
      const text = await callGemini(
        'You are a sharp, motivating productivity coach. Give me a punchy, natural reminder nudge to get back to my tasks. Keep it to one complete, impactful sentence under 30 words. No robotic greetings.',
        `Pending tasks: ${summary}. Remind me to get back to it.`,
        150
      );
      body = text.trim();
    } catch (err) {
      console.error('Reminder AI call failed, using plain fallback:', err.message);
    }
  }

  nativeNotify('FocusAgent Reminder', body);
  console.log(`[${new Date().toLocaleTimeString()}] Reminder fired: ${body}`);
}

setInterval(checkAndRemind, REMINDER_MINUTES * 60 * 1000);
console.log(`Reminder loop active: checking every ${REMINDER_MINUTES} minute(s).`);

app.listen(PORT, () => {
  console.log(`FocusAgent running at http://localhost:${PORT}`);
});
