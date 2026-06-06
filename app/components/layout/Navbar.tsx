"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import { Database } from "lucide-react";

// We allow passing `children` so the Editor can inject its "Save" button directly into the right side!
export default function Navbar({ children, isAuthenticated, loginAction }: any) {
    const pathname = usePathname();
    const isEditor = pathname.startsWith('/editor/');

    return (
        <nav className="border-b border-surface-border bg-background/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

                {/* BRAND LOGO */}
                <Link href="/" className="font-bold text-lg sm:text-xl tracking-tighter flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-gradient-to-tr from-brand-blue to-brand-emerald flex items-center justify-center">
                        <Database size={14} className="text-white" />
                    </div>
                    <span className="hidden sm:block">DB Designer</span>
                </Link>

                {/* RIGHT SIDE CONTROLS */}
                <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium">

                    {/* If we are NOT in the editor, show standard navigation */}
                    {!isEditor && (
                        <div className="hidden md:flex items-center gap-6 text-slate-400 mr-4">
                            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
                            <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
                        </div>
                    )}

                    {/* Inject Editor controls (Save Button, Title) here if they exist */}
                    {children}

                    {/* Authentication Button (Only show on Landing/Dashboard if no children are passed) */}
                    {!children && (
                        isAuthenticated ? (
                            <Link href="/dashboard" className="bg-surface hover:bg-surface-hover text-foreground px-4 py-2 rounded-full transition-all border border-surface-border hidden sm:block">
                                Workspace
                            </Link>
                        ) : (
                            <form action={loginAction}>
                                <button type="submit" className="bg-foreground text-background hover:opacity-80 px-4 py-2 rounded-full transition-all font-bold">
                                    Sign In
                                </button>
                            </form>
                        )
                    )}

                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}