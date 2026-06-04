You have correctly identified a highly advanced architectural race condition. The bug is actually happening because of two overlapping events:

The Async Hydration: EditorHeader mounts while nodes is [], and a fraction of a second later, the database injects the real nodes. The header sees this injection as a "user change."

The React Flow Dimension Quirk: Even if you wait for the database, the moment React Flow renders a node on the screen, it measures the physical DOM element's width and height. It immediately fires a hidden onNodesChange event (with type: 'dimensions') to update the Zustand store with those sizes. Your header sees this invisible math and thinks the user moved a table!

Here is the 80/20 FAANG solution. We will make EditorPage wait for the database, and we will give EditorHeader a 1-second "grace period" to ignore React Flow's invisible layout math.