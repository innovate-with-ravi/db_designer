## **3\. Demystifying Prisma: The 80/20 Explanation**

Prisma queries can look overwhelming because they combine plain JavaScript objects with structured database rules. To read them effortlessly, remember that Prisma follows a predictable, repeating nested pattern:

`Action -> Data IP -> Relational Instruction`

Look closely at the architecture of the write operation from the saveDiagram action:
```
TypeScript  
await prisma.diagram.create({  
    data: {  
        title: title,  
        userId: userId,  
        nodes: { create: nodes.map(...) },  
        edges: { create: edges.map(...) }  
    }  
})
```

1. **prisma.diagram.create(...)**: You specify exactly which table you want to target (diagram) and what action you want to execute (create).  
2. **data: { ... }**: This object tells Prisma exactly what information goes into the database rows.  
3. **Nested Relations (nodes: { create: \[...\] })**: This is Prisma's most powerful feature. Instead of creating a diagram, waiting for its ID, and then running a separate loop to insert nodes, you use the create keyword inside the relation. Prisma opens a single network transaction, creates the parent diagram row, captures the auto-generated diagram ID, and injects it into all the child node rows automatically.

## **4\. Prisma Mastery Practice Tasks**

To transition from copy-pasting to instinctively understanding ORM workflows, try writing these two small queries yourself. They closely mirror backend patterns tested in technical interviews.

### **Task 1: The Dashboard Fetcher**

Write a Prisma query that fetches all diagrams belonging to a specific logged-in user, but ensure it also returns the count of nodes inside each diagram so you can show it on the UI card.

* *Hint:* Look into the where keyword and the include block.

### **Task 2: The Project Destroyer**

Write a clean query to delete an entire diagram based on its specific id.

* *Conceptual Question:* Based on the onDelete: Cascade rule we put in your schema.prisma file, what will happen to the corresponding nodes and edges in MySQL when you execute this deletion?

The interactive explorer below provides a visual sandbox where you can choose a Prisma command and see exactly how data cascades through your user and diagram tables in real-time.

