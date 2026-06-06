import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { Menu, X } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row relative">

            {/* The Invisible Checkbox Hack for Mobile State */}
            <input type="checkbox" id="mobile-menu" className="hidden peer" />

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-surface-border sticky top-0 bg-background z-40">
                <div className="flex items-center gap-4">
                    <label htmlFor="mobile-menu" className="p-2 cursor-pointer text-foreground bg-surface rounded-md border border-surface-border peer-checked:hidden">
                        <Menu size={20} />
                    </label>
                    <Link href="/" className="font-bold text-lg">DB Designer Docs</Link>
                </div>
                <ThemeToggle />
            </div>

            {/* Sidebar (Responsive Overlay on Mobile, Sticky on Desktop) */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background transform -translate-x-full transition-transform duration-300 peer-checked:translate-x-0 md:relative md:translate-x-0 md:flex flex-col border-r border-surface-border h-screen sticky top-0 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="font-bold text-lg hover:text-brand-blue transition-colors">← Back to Home</Link>

                    {/* Close button for mobile */}
                    <label htmlFor="mobile-menu" className="md:hidden p-2 cursor-pointer text-slate-400 hover:text-foreground">
                        <X size={20} />
                    </label>
                </div>

                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Getting Started</h3>
                <ul className="space-y-2 mb-8 text-sm">
                    <li><Link href="/docs" className="text-brand-blue font-medium block p-2 rounded hover:bg-surface">Introduction</Link></li>
                    <li><Link href="/docs/quickstart" className="text-slate-500 hover:text-foreground block p-2 rounded hover:bg-surface">Quickstart</Link></li>
                </ul>

                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Core Concepts</h3>
                <ul className="space-y-2 text-sm">
                    <li><Link href="#" className="text-slate-500 hover:text-foreground block p-2 rounded hover:bg-surface">Entities & Attributes</Link></li>
                    <li><Link href="#" className="text-slate-500 hover:text-foreground block p-2 rounded hover:bg-surface">Relationships (1:N, M:N)</Link></li>
                    <li><Link href="#" className="text-slate-500 hover:text-foreground block p-2 rounded hover:bg-surface">Exporting to MySQL</Link></li>
                </ul>
            </aside>

            {/* Backdrop for mobile to close the menu by clicking outside */}
            <label htmlFor="mobile-menu" className="fixed inset-0 bg-black/50 z-40 hidden peer-checked:block md:hidden cursor-pointer"></label>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-12 max-w-4xl w-full">
                {children}
            </main>
        </div>
    );
}