**The IDE Secret: "Debouncing"**
How does VS Code give you real-time error squiggles without freezing? It uses a technique called Debouncing.

Instead of running validation on every keystroke, the system sets a timer (e.g., 500ms). Every time the user types or drags, the timer resets. The validation only runs when the user stops interacting with the app for half a second.