**The Mental Model: The HTML5 DnD API**
React Flow doesn't actually handle the dragging from the sidebar—your browser does.

**The Sidebar (onDragStart):** When the user clicks and drags a shape in the sidebar, we attach a hidden "data payload" to their mouse pointer (e.g., "Hey, I am holding an attribute of type: key").

**The Canvas (onDragOver):** We have to tell the browser, "Yes, you are allowed to drop things in this zone."

**The Drop (onDrop):** When the user lets go of the mouse, the canvas reads the hidden data payload, calculates exactly where the mouse is on the screen, converts that into React Flow's internal x, y coordinates, and fires your Zustand addNode() function.