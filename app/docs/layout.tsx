import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">

            {/* Mobile Header (Hidden on Desktop) */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-surface-border">
                <Link href="/" className="font-bold text-lg">DB Designer Docs</Link>
                <ThemeToggle />
            </div>

            {/* Sidebar (Hidden on Mobile, Sticky on Desktop) */}
            <aside className="hidden md:flex w-64 flex-col border-r border-surface-border h-screen sticky top-0 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="font-bold text-lg hover:text-brand-blue transition-colors">← Back to Home</Link>
                    <ThemeToggle />
                </div>

                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Getting Started</h3>
                <ul className="space-y-2 mb-8 text-sm">
                    <li><Link href="/docs" className="text-brand-blue font-medium">Introduction</Link></li>
                    <li><Link href="/docs/quickstart" className="text-slate-500 hover:text-foreground">Quickstart</Link></li>
                </ul>

                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Core Concepts</h3>
                <ul className="space-y-2 text-sm">
                    <li><Link href="#" className="text-slate-500 hover:text-foreground">Entities & Attributes</Link></li>
                    <li><Link href="#" className="text-slate-500 hover:text-foreground">Relationships (1:N, M:N)</Link></li>
                    <li><Link href="#" className="text-slate-500 hover:text-foreground">Exporting to MySQL</Link></li>
                </ul>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-12 max-w-4xl">
                {children}
            </main>
        </div>
    );
}