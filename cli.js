const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, 'tasks.json');

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

const [,, command, ...args] = process.argv;

if (command === 'add') {
  const text = args[0];
  const priority = (args[1] && ['High', 'Medium', 'Low'].includes(args[1])) ? args[1] : 'Medium';

  if (!text) {
    console.log('❌ Please provide a task: node cli.js add "Buy milk" [High|Medium|Low]');
    process.exit(1);
  }
  const tasks = readTasks();
  tasks.push({ text, priority, done: false });
  writeTasks(tasks);
  console.log(`✅ Added [${priority}] task: "${text}"`);
} 
else if (command === 'list') {
  const tasks = readTasks();
  if (tasks.length === 0) {
    console.log('📝 No tasks found.');
  } else {
    console.log('\n--- Your Pending Tasks ---');
    tasks.forEach((t, i) => {
      const status = t.done ? '✅' : '⏳';
      console.log(`${i}. ${status} [${t.priority}] ${t.text}`);
    });
    console.log('--------------------------\n');
  }
} 
else if (command === 'done') {
  const index = parseInt(args[0]);
  const tasks = readTasks();
  if (isNaN(index) || !tasks[index]) {
    console.log('❌ Invalid task number. Use "node cli.js list" to see numbers.');
    process.exit(1);
  }
  tasks[index].done = true;
  writeTasks(tasks);
  console.log(`🎉 Marked "${tasks[index].text}" as done!`);
} 
else {
  console.log(`
FocusAgent CLI
Usage:
  node cli.js add "Task name" [High|Medium|Low] - Add a task with priority
  node cli.js list                             - List all tasks
  node cli.js done <number>                    - Mark a task as complete
  `);
}
