# **The UI State vs. The Database State**

To get the true whiteboard flexibility where a user can drag an attribute oval three inches away from the entity rectangle and have the line stretch dynamically, that oval must be a real node in the React Flow canvas, not just a CSS illusion.


But you are 100% right in Point #4: saving 20 individual nodes in your backend database for one table is a terrible idea.

The Solution: The State Compiler
We will separate what the Canvas sees from what the Database saves.

**On the Canvas (Zustand UI State)**: React Flow will track every entity and every attribute as separate, draggable nodes `({ type: 'entity' }, { type: 'attribute' })`. It will also track the edges (lines) connecting them. This gives you the 100% flexible whiteboard feel you want.

**On Save (The Compiler)**: Before we send the data to your MySQL database, we write a fast compiler function. This function looks at the entity, follows the lines to all connected attributes, and bundles them into that clean, single JSON array you designed.

The Result: The database only stores one row per Entity, with a nested attributes array inside it. When the user loads the project later, your frontend does the reverse: it reads the array and "explodes" it back out into separate draggable ovals on the canvas.