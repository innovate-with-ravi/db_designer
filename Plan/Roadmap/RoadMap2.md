

### **The Master Architecture Map: DB Designer**

This is your North Star. Keep your folders organized exactly like this to maintain a clean, FAANG-level codebase.

#### **1\. The Core Tech Stack**

* **Framework:** Next.js (App Router)  
* **Styling:** Tailwind CSS (Rapid UI component building)  
* **Visual Canvas:** React Flow (Handles drag, drop, and zooming)  
* **State Management:** Zustand (Global store for the nodes and validation)  
* **Authentication:** NextAuth.js (Google OAuth)  
* **Validation:** Zod (Validates the schema before SQL generation)  
* **Database:** MySQL (Stores user projects, nodes, and edges)

#### **2\. App Router Structure (The Pages)**

Keep your routing incredibly lean.

* app/page.jsx — **The Landing Page.** Hero text, features, and the "Sign In" button.  
* app/dashboard/page.jsx — **Project Hub.** Protected route. Shows a grid of the user's saved diagrams with a "Create New" button.  
* app/editor/\[id\]/page.jsx — **The Workspace.** The main event. This takes up the full screen and holds the React Flow canvas.

#### **3\. Component Architecture (/components)**

Break the UI down into focused, reusable pieces.

* components/canvas/DiagramCanvas.jsx — The wrapper for React Flow.  
* components/nodes/EntityNode.jsx — Your custom table node. Handles the View/Edit mode toggle and the dynamic "Missing PK" warnings.  
* components/edges/RelationshipEdge.jsx — The 90-degree orthogonal line with the diamond center and the two cardinality inputs (1, M, N) on either side.  
* components/ui/Sidebar.jsx — The slide-out menu that lists global Zod errors or displays the final generated SQL.

#### **4\. The Zustand Brain (/store)**

This replaces complex prop-drilling.

* store/useDiagramStore.js  
  * **State:** nodes (array), edges (array), globalErrors (array).  
  * **Actions:** addNode(), updateNodeData(), addEdge(), validateDiagram().

#### **5\. API Routes (/app/api)**

Your backend logic that talks to MySQL.

* app/api/auth/\[...nextauth\]/route.js — Handles Google login.  
* app/api/diagrams/route.js — GET all projects for the dashboard, POST to create a new blank project.  
* app/api/diagrams/\[id\]/route.js — PUT to auto-save the diagram state, DELETE to trash a project.  
* app/api/generate/route.js — **The Engine.** Receives the JSON state, runs final Zod validation, and translates the graphs into raw MySQL DDL strings.

#### **6\. MySQL Database Schema**

The tables you will construct to save user data.

* **users** — NextAuth standard table.  
* **diagrams** — id, user\_id, title, created\_at.  
* **diagram\_nodes** — id, diagram\_id, type, x\_pos, y\_pos, node\_data (JSON storing attributes).  
* **diagram\_edges** — id, diagram\_id, source\_node, target\_node, source\_cardinality, target\_cardinality.