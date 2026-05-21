### **3\. Enforcing Data Types and Sizes**

**Verdict: Fix It.**  
This is the hardest UX challenge of a database designer. If you interrupt a user's flow while they are rapidly drawing ovals to ask for VARCHAR(255), they will hate the product. But if you let them generate SQL with blank datatypes, the database crashes.  
**The Strategy: Separate "Drawing Mode" from "Definition Mode"**  
We do not force the user to fill out the datatypes while they are drawing the shapes. We let them sketch the whole diagram first.  
Here is how you engineer the enforcement:

* **The UI (The Smart Row):** Whether an attribute is a visual oval on the canvas or an extra row inside the expanded Entity form, it needs a home to define its data. We will add a "Properties Panel" (a right-side sidebar). When a user clicks *any* entity or attribute, the panel slides out, showing the "Smart Row" (Name, Type Dropdown, Size, PK/NN toggles).  
* **The Backend State:** Every attribute node in Zustand starts with a default payload: data: { label: 'new\_attr', dataType: '', size: '' }.  
* **The Enforcement (The Zod Net):** We enforce the rules *only* when they click the big "Generate Database" button.  
  1. The button triggers a validation function.  
  2. It loops through your compiled JSON array.  
  3. If it finds any attribute where dataType \=== '', it halts the generation.  
  4. It populates your global errors array in Zustand (e.g., "Table STUDENT has an attribute 'roll\_no' with missing Data Type").  
  5. The user clicks the error, the canvas zooms to that shape, and the Properties Panel opens, forcing them to fix it.