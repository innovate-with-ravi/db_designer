

### **1\. The Route Map (Next.js App Router)**

Keep the page structure lean. You only need three main views.

* app/page.tsx: **Landing Page.** Simple hero section explaining the tool, with a "Sign in with Google" (NextAuth) button.  
* app/dashboard/page.tsx: **Project Hub.** A grid displaying the user's saved ER diagrams. Includes a "Create New Diagram" button.  
* app/editor/\[id\]/page.tsx: **The Core App.** The actual workspace containing the full-screen interactive canvas.<b>(done)</b>

### **2\. The Frontend Architecture (React Flow Components)** <b>(done)</b>

This is where the heavy UI logic lives.

* **\<Canvas/\>**: The main React Flow wrapper. Handles the drag-and-drop physics and zooming. <b>(done)</b>
* **\<EntityNode/\>**: The custom node we designed.  <b>(done)</b>
  * *View Mode:* Shows table name and column list.  <b>(done)</b>
  * *Edit Mode:* Expands into a form. Checks for missing Primary Keys live and highlights inputs in red if empty.  <b>(done)</b>
* **\<RelationshipEdge/\>**: The custom edge we designed. Renders the 90-degree step line, the center diamond, and the two floating cardinality inputs (1, N, M, etc.). <b>(done)</b> 
* **\<ValidationConsole/\>**: Slides out when the user clicks "Generate". Displays global errors (e.g., "Table 'Orders' is completely disconnected").  <b>(done)</b>
* **\<SqlOutputModal/\>**: A popup window displaying the final, formatted DDL SQL script with a "Copy to Clipboard" button.<b>(done)</b>

### **3\. The State Management (Zustand)** <b>(done)</b>

Your useDiagramStore.ts file will act as the brain, holding:

* nodes: Array of all tables and their attributes.  
* edges: Array of all lines connecting the tables.  
* globalErrors: Array of structural errors generated before SQL compilation.

__________________

### **4\. The Backend Engine (Next.js API Routes)** <b>(done)</b>

* api/diagrams/route.ts: (GET/POST) Fetches a user's saved diagrams or creates a new one in your MySQL database.  
* api/diagrams/\[id\]/route.ts: (PUT/DELETE) Auto-saves diagram changes and deletes projects.  
* api/generate-sql/route.ts: **The Crown Jewel.** This route takes the JSON from Zustand, validates it globally (using Zod), and translates the nodes and edges into a raw SQL string. -> notice we did this on client side. I also added color-coding on server side using shiki library & added code in a server-action action/generateSqlHtml.ts. (share code of generateSqlHtml & sqlGenerator ). I think this is rubbish cause or  sqlGenerator.ts file runs on server only

### **5\. The Database Schema (MySQL)** <b>(done)</b>

Your own database to save user projects.

* **users**: Managed automatically by NextAuth (id, email, name).  
* **diagrams**: (id, user\_id, title, updated\_at).  
* **diagram\_nodes**: (id, diagram\_id, type, label, x\_pos, y\_pos, node\_data\_json).  
* **diagram\_edges**: (id, diagram\_id, source\_node, target\_node, source\_cardinality, target\_cardinality).


### **6\. Docs**
--you can leave the docs for now, because I am thinking of a generic docs roadmap so that we don't have to create a page for every single feature in doc & going to discuss it with you later. So, for now you can just fix the navigation.

I want a docs roadmap from you so that we can make a generic doc template and we don't have to write every single feature's document page. 
Something like a generic blog's template!
What I am thinking is we can use a tool like EJS templates to create a template for documentation that we are going to follow all over the app. 
You can provide any better idea if you have. 

or we can just complete the whole documentation in a single page or component.