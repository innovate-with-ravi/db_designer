import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Documentation | DB Designer",
    description: "Learn how to design and compile database schemas.",
};

export default function DocsPage() {
    return (
        <div className="prose prose-slate dark:prose-invert max-w-none pb-20">
            <h1 className="text-4xl font-extrabold mb-4 text-foreground tracking-tight">DB Designer Documentation</h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Welcome to DB Designer. This tool bridges the gap between whiteboard sketching and production-ready database architecture. Design your Entity-Relationship (ER) diagrams visually, and let our compiler handle the relational math.
            </p>

            <hr className="border-border my-8" />

            <h2 id="basics" className="text-2xl font-bold mt-12 mb-4 text-foreground scroll-mt-24">1. Canvas Basics</h2>
            <p className="text-muted-foreground">
                The canvas is your primary workspace. Drag and drop symbols from the left sidebar to start building.
            </p>
            <ul>
                <li><strong>Entities:</strong> Represent your database tables (e.g., <code>USERS</code>, <code>PRODUCTS</code>).</li>
                <li><strong>Simple Attributes:</strong> Standard columns (e.g., <code>email</code>, <code>price</code>).</li>
                <li><strong>Key Attributes:</strong> The Primary Key of your table. <em>Note: Our engine strictly enforces exactly one primary key per entity.</em></li>
                <li><strong>Derived Attributes:</strong> Values calculated on the fly (e.g., <code>age</code> from <code>dob</code>). The compiler will visually document these but will <strong>not</strong> create physical columns for them in your SQL/Prisma output, saving database space.</li>
                <li><strong>Multi-Valued Attributes:</strong> For arrays of data (e.g., multiple <code>phone_numbers</code>). Our compiler automatically extracts these into <strong>First Normal Form (1NF) child tables</strong> with Composite Primary Keys upon export.</li>
            </ul>

            <h2 id="properties" className="text-2xl font-bold mt-12 mb-4 text-foreground scroll-mt-24">2. The Properties Panel & Hierarchy</h2>
            <p className="text-muted-foreground">
                Clicking on any Entity on the canvas opens the Properties Panel on the right. This is where you configure the underlying data structure.
            </p>
            <ul>
                <li><strong>Composite Attributes:</strong> If an attribute has sub-components (like a <code>name</code> split into <code>first</code> and <code>last</code>), set its type to Composite. Drag child attributes onto it, and the panel will organize them into a clean, collapsible folder structure. The compiler will automatically flatten these into physical columns (e.g., <code>name_first</code>, <code>name_last</code>).</li>
                <li><strong>Hidden Attributes:</strong> Don't want to clutter your canvas with timestamps or internal IDs? Add them as "Hidden Attributes" in the panel. They will compile normally without taking up visual space.</li>
                <li><strong>Data Types & Constraints:</strong> Assign <code>INT</code>, <code>VARCHAR</code>, <code>BOOLEAN</code>, etc. You can also toggle strict database constraints like <code>NOT NULL</code> and <code>UNIQUE</code>.</li>
            </ul>

            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-6 my-8 shadow-sm">
                <h3 className="font-bold text-brand-blue mb-2 flex items-center gap-2 mt-0">
                    <span>💡</span> Pro Tip: Smart Sizing
                </h3>
                <p className="text-sm text-muted-foreground m-0">
                    The panel automatically knows which data types require a size. If you select <code>VARCHAR</code>, the size input activates. If you select <code>BOOLEAN</code> or <code>DATE</code>, it locks automatically to prevent syntax errors.
                </p>
            </div>

            <h2 id="relationships" className="text-2xl font-bold mt-12 mb-4 text-foreground scroll-mt-24">3. Relationships & Connections</h2>
            <p className="text-muted-foreground">
                Connect Entities to each other to define relationships. When you draw an edge between two entities, our engine calculates the Foreign Keys automatically.
            </p>
            <ul>
                <li><strong>1:N / N:1 (One-to-Many):</strong> The compiler automatically places the Foreign Key on the correct "Many" side of the relationship.</li>
                <li><strong>M:N (Many-to-Many):</strong> If you set both cardinalities to "M" or "N", the compiler will autonomously generate a <strong>Junction Table</strong> containing a Composite Primary Key combining both parent IDs.</li>
                <li><strong>Unary (Self-Referencing):</strong> Connect an entity to itself to create hierarchical tables (like an employee reporting to a manager).</li>
            </ul>

            <h2 id="validation" className="text-2xl font-bold mt-12 mb-4 text-foreground scroll-mt-24">4. The Validation Console</h2>
            <p className="text-muted-foreground">
                Writing DDL by hand is prone to errors. Our Validation Console acts as an always-on strict pair programmer.
            </p>
            <p className="text-muted-foreground">
                If you forget a Primary Key, leave a Data Type blank, or create a duplicate column name, the console will slide up. Click the <strong>Focus & Fix 🔍</strong> button next to any error, and the canvas will automatically zoom to the broken node and open its properties panel so you can resolve it instantly.
            </p>

            <h2 id="export" className="text-2xl font-bold mt-12 mb-4 text-foreground scroll-mt-24">5. Exporting Code</h2>
            <p className="text-muted-foreground">
                Once your diagram is valid, click <strong>Export</strong> in the top header. You can instantly generate and copy production-ready code in three dialects:
            </p>
            <ul>
                <li><strong>MySQL:</strong> Standard relational DDL with inline primary keys.</li>
                <li><strong>Oracle SQL:</strong> Strict enterprise formatting, utilizing <code>VARCHAR2</code>, <code>NUMBER</code>, and explicitly named <code>CONSTRAINT</code> blocks for composite keys.</li>
                <li><strong>Prisma Schema:</strong> Modern ORM architecture mapping perfectly to full-stack Next.js/Node apps, complete with auto-calculated bi-directional arrays (back-relations).</li>
            </ul>
        </div>
    );
}