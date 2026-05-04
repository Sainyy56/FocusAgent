#!/bin/bash
sleep 2

TASKS_FILE="$HOME/.focusagent_tasks.json"
HOUR=$(date +%H)

if [ "$HOUR" -lt 12 ]; then GREETING="Good morning"
elif [ "$HOUR" -lt 17 ]; then GREETING="Good afternoon"
else GREETING="Good evening"; fi

if [ -f "$TASKS_FILE" ]; then
  PENDING=$(python3 -c "
import json
with open('$TASKS_FILE') as f:
    tasks = json.load(f)
pending = [t for t in tasks if not t.get('done', False)]
print(f'{len(pending)} tasks pending today')
")
  FIRST=$(python3 -c "
import json
with open('$TASKS_FILE') as f:
    tasks = json.load(f)
pending = [t for t in tasks if not t.get('done', False)]
order = {'high':0,'medium':1,'low':2}
pending.sort(key=lambda t: order.get(t.get('priority','medium'),1))
print(pending[0]['text'][:80] if pending else 'All done!')
")
else
  PENDING="No tasks synced yet"
  FIRST="Open FocusAgent and add your tasks!"
fi

osascript -e "tell application \"System Events\" to display dialog \"$GREETING 👋

$PENDING
Next up: $FIRST\" buttons {\"Let's go!\"} default button 1 with title \"FocusAgent\""

echo "[$(date)] Notified: $PENDING" >> "$HOME/.focusagent.log"
