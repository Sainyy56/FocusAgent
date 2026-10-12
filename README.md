# FocusAgent — Local Setup (macOS)

This gives you the full setup: a local server that holds your API key, stores
tasks in a file both the web UI and the background reminder can read, and
fires **native macOS notifications** every 15/30 min — even if you close the
browser tab.

## What's in this folder
- `server.js` — local backend: Claude API proxy + task storage + reminder loop
- `public/index.html` — your FocusAgent UI (already rewired to talk to the local server)
- `.env.example` — copy to `.env` and add your API key
- `tasks.json` — where tasks are stored (auto-created/updated, don't edit by hand while the server runs)
- `com.focusagent.server.plist` — optional: makes the server auto-start on login

## Step 1 — Install Node.js (if you don't have it)
Check first:
```bash
node -v
```
If that fails, install from https://nodejs.org (LTS version) or via Homebrew:
```bash
brew install node
```

## Step 2 — Install dependencies
```bash
cd ~/focusagent   # wherever you put this folder
npm install
```

## Step 3 — Add your API key
```bash
cp .env.example .env
```
Open `.env` in any text editor and paste your free key from
https://aistudio.google.com/apikey after `GEMINI_API_KEY=` (no credit card needed —
Google's free tier is generous enough for a personal reminder app like this).

You can also change `REMINDER_INTERVAL_MINUTES` here (default 30 — set to 15 if you prefer).

## Step 4 — Run it
```bash
npm start
```
You should see:
```
Reminder loop active: checking every 30 minute(s).
FocusAgent running at http://localhost:3210
```
Open **http://localhost:3210** in your browser — that's your FocusAgent UI, now backed
by the local server. Add tasks as normal; they're saved to `tasks.json`.

The first time it runs, macOS will ask for notification permission — allow it,
or reminders won't show.

Leave this terminal window running. As long as `server.js` is alive, reminders
fire on schedule — the browser tab can be closed.

## Step 5 (optional but recommended) — Auto-start on login
This makes the reminder server start automatically whenever you log into your Mac,
so you never have to remember to run `npm start` yourself.

1. Edit `com.focusagent.server.plist`: replace both `/Users/YOUR_USERNAME/focusagent`
   paths with your actual folder path, and confirm the Node path:
   ```bash
   which node
   ```
   (update `/usr/local/bin/node` in the plist if yours differs — Homebrew on Apple
   Silicon is usually `/opt/homebrew/bin/node`)

2. Copy it into place and load it:
   ```bash
   cp com.focusagent.server.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.focusagent.server.plist
   ```

3. Check it's running:
   ```bash
   curl http://localhost:3210/api/tasks
   ```
   Should return `[]` or your task list.

To stop the auto-start later:
```bash
launchctl unload ~/Library/LaunchAgents/com.focusagent.server.plist
```

Logs live at `/tmp/focusagent.log` and `/tmp/focusagent.error.log` if something
isn't firing and you want to see why.

## How the reminder actually works
Every `REMINDER_INTERVAL_MINUTES`, `server.js` checks `tasks.json` for anything
not marked done. If there's pending work, it asks Gemini for a short nudge and
fires it as a native macOS notification via `osascript` (built into macOS, no
extra install). If the API call fails for any reason (offline, bad key, rate
limit), it still fires a plain-text fallback reminder — so you never silently
miss one.

## Notes
- Your API key never touches the browser — it stays in `.env` on your machine,
  read only by `server.js`.
- Free-tier Gemini has rate limits (roughly 15 requests/min on Flash as of
  mid-2026) — totally fine for one nudge every 15–30 min, but if you hammer
  the chat box repeatedly you may hit a 429. The server falls back gracefully
  if that happens on a reminder tick.
- If you ever want a different reminder cadence for a single day, just edit
  `REMINDER_INTERVAL_MINUTES` in `.env` and restart the server (`npm start` again,
  or `launchctl unload` + `launchctl load` if using the LaunchAgent).
