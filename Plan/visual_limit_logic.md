### **2\. The 4-5 Visual Limit Logic**

**Verdict: Fix It.**  
You are absolutely right that we must distinguish between attribute lines and relationship lines. To implement this without breaking the fluid whiteboard feel, we will use a powerful React Flow feature called isValidConnection.  
Instead of waiting for the user to connect the line and *then* rejecting it, isValidConnection checks the rules *while* the user is dragging the line. If the rules fail, the line physically refuses to snap to the handle.  
**The Blueprint for isValidConnection:**  
You will add this function to your EditorPage.tsx and pass it directly into the \<ReactFlow\> wrapper.

1. **Get the Target:** The function receives the connection parameters. Look up the source and target node IDs in your Zustand nodes array using .find().  
2. **Verify the Types:** Check if one node is an entity and the other is an attribute. (If they are connecting two entities via a relationship, instantly return true to allow it).  
3. **Count the Existing Edges:** If it *is* an attribute connection, filter your Zustand edges array. Count how many edges currently involve that specific entity's ID *where the other end of the line is an attribute*.  
4. **The Threshold:** If the count is \>= 5, return false (this blocks the line from snapping).  
5. **Trigger the UI:** Inside that same block where you return false, update a state variable in Zustand (e.g., setEntityFormExpanded(entityId)). This tells your \<EntityNode /\> component to smoothly animate its hidden form open.

