### **MySQL & Prisma**

It is highly encouraged to understand the infrastructure you are building on. When interviewing at top companies, you need to be able to explain *why* you chose a technology, not just how to copy its syntax.  
Here is the straightforward, high-level architecture of what we are building.

#### **1\. What is MySQL? (The Warehouse)**

MySQL is a Relational Database. Think of it as a massive, highly organized Excel spreadsheet that lives on a server. It is incredibly strict. If you tell MySQL that the age column only accepts numbers (INT), and you try to hand it a word, it will violently reject it.

* **Why we are using it:** We need a permanent place to save the user's nodes and edges JSON arrays so their whiteboard doesn't disappear when they refresh the browser.

#### **2\. What is Prisma? (The Translator / ORM)**

Prisma is an **Object-Relational Mapper (ORM)**.  
Normally, to get data out of MySQL, you have to write raw SQL strings in your backend code:  
const data \= db.query("SELECT \* FROM users WHERE id \= '123'");  
Writing raw SQL inside JavaScript is dangerous. It is prone to typos, lacks autocomplete, and is highly vulnerable to hackers (SQL Injection).  
Prisma acts as a smart translator between your Next.js JavaScript code and your MySQL database.

* You define your database structure once in that schema.prisma file.  
* Prisma reads that file and automatically generates strict TypeScript types for your entire database.  
* Instead of writing raw SQL strings, you write clean JavaScript: const user \= await prisma.user.findUnique({ where: { id: '123' } }).  
* Prisma instantly translates that JavaScript into perfect, highly optimized SQL, sends it to the database, and returns the data to you.

```
From here, it's clear that -> Prima is similar to mongoose instead of writing raw SQL we write normal JavaScript as we write while using MangoDB and prisma convert that JavaScript into SQL, query it on the database and returns the result from DB & maps the result into JS object & vice-vers(storing JS object into relationalDB i.e. mapping JS object into a row/tuple of DB)
```

#### **How it fits together in our App:**

1. User clicks "Save Diagram".  
2. Next.js takes the nodes and edges JSON arrays.  
3. Next.js hands them to Prisma.  
4. Prisma writes the INSERT INTO SQL command securely and pushes the JSON into MySQL.

