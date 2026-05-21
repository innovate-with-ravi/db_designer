**The "Smart Row" UX Design**
-
When the user clicks the (...) to expand the entity box and add an attribute, do not just give them a blank text box. Give them a structured row with these specific elements:

**Name (Text Input):** A simple input for the column name (e.g., user_id).

**Type (Dropdown):** A searchable select menu.

***Pro-Tip:*** Do not list all 50+ SQL data types initially. Stick to the 80/20 rule. Give them the top 5 most used types at the very top of the list (INT, VARCHAR, TEXT, BOOLEAN, TIMESTAMP), followed by the rest.

**Size/Length (Number Input):** A small, optional number input that only appears or becomes active if the selected type requires it (like VARCHAR). If they select BOOLEAN or DATE, this box automatically grays out or disappears.

**Constraints (Toggle Icons):** Small, clickable icons or checkboxes for the most common constraints:

🔑 PK (Primary Key)

🚫 NN (Not Null)

🦄 UQ (Unique)