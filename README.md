# DB Designer

A visual Entity-Relationship (ER) diagram builder and autonomous Relational Compiler.

DB Designer bridges the gap between whiteboard sketching and production architecture. It allows developers to draw complex schemas using an infinite canvas and instantly compiles that visual data into strict, production-ready code.

## 🚀 Core Features

* **Abstract Syntax Tree (AST) Compiler:** Uses a custom recursive flattening algorithm to convert visual nodes into a compiled schema state.
* **Autonomous Normalization:** Automatically extracts Multi-Valued attributes into First Normal Form (1NF) child tables with composite primary keys.
* **Multi-Dialect Code Generation:** 
    * **MySQL:** Standard relational DDL.
    * **Oracle SQL:** Strict enterprise formatting with oracle's datatypes and syntax.
    * **Prisma ORM:** Full-stack schema generation, including dynamically calculated bi-directional back-relations.
* **Zod Gatekeeper:** A strict validation engine that catches missing data types, duplicate tables, columns, and SQL reserved word conflicts (e.g., preventing tables named `USER` or `GROUP`).

## 🧠 Technical Architecture

This application bypasses standard UI state management and relies on graph traversal algorithms to compile the schema:

1.  **Graph Traversal (BFS/DFS):** The engine uses Breadth-First and Depth-First Search algorithms to crawl the React Flow edges. It identifies the root Entities and traverses outwards to discover deep, nested sub-attributes.
2.  **Junction Table Generation:** When a Many-to-Many (M:N) edge is detected, the engine autonomously builds the required associative junction table without user intervention.
3. **Multi-Valued Attribute:** Our compiler detects multi-valued attributes &  automatically creates an isolated table for it with foreign key referencing the parent entity table & a composite primary key. Enforcing `1NF`First Normal Form into Database.
4.  **Derived State Ignorance:** The compiler is smart enough to visually display Derived attributes (like `age` from `dob`) while intentionally dropping them from the final SQL output to save physical database space.

## ⚒️ Tech Stack

* **Framework:** Next.js (App Router)
* **Visual Canvas:** React Flow (@xyflow/react)
* **Database:** MySql with Prisma ORM
* **Global Data Sharing:** Zustand
* **Validation:** Zod
* **Styling:** Tailwind CSS + Framer Motion