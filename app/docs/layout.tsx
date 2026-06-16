"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { Menu, X } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const [activeSection, setActiveSection] = useState<string>("basics");

    // Reference to lock the scroll spy while a user is actively clicking a link
    const isClickingRef = useRef(false);

    // 🌟 Scroll Spy Logic Fixed
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                // Ignore scroll events if the user just clicked a sidebar link
                if (isClickingRef.current) return;

                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            // Triggers when a heading enters the top 20% to 50% of the screen
            { rootMargin: "-10% 0px -50% 0px" }
        );

        // setTimeout ensures the DOM is fully painted before querying the headers
        const timeoutId = setTimeout(() => {
            const sections = document.querySelectorAll("h2[id]");
            sections.forEach((section) => observer.observe(section));
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, []);

    // 🌟 Helper to handle clicks, set active state, and close mobile menu
    const handleLinkClick = (sectionId: string) => {
        setActiveSection(sectionId);

        // Lock the observer for 800ms so smooth scrolling doesn't override the active state
        isClickingRef.current = true;
        setTimeout(() => {
            isClickingRef.current = false;
        }, 800);

        const checkbox = document.getElementById("mobile-menu") as HTMLInputElement | null;
        if (checkbox) checkbox.checked = false;
    };

    const getLinkClass = (sectionId: string) => {
        const isActive = activeSection === sectionId;
        return `block p-2 rounded-md border transition-all duration-200 ${isActive
                ? "bg-surface border-surface-border text-foreground font-semibold shadow-sm"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface font-medium"
            }`;
    };

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

            {/* 🌟 THE STICKY FIX: Added 'md:sticky md:top-0 self-start' to make it stick properly in a flex row */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background transform -translate-x-full transition-transform duration-300 peer-checked:translate-x-0 md:sticky md:top-0 md:translate-x-0 md:flex flex-col border-r border-surface-border h-screen p-6 overflow-y-auto self-start">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/dashboard" className="font-bold text-lg hover:text-brand-blue transition-colors">← Dashboard</Link>

                    {/* Close button for mobile */}
                    <label htmlFor="mobile-menu" className="md:hidden p-2 cursor-pointer text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </label>
                </div>

                <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wider mb-3">Getting Started</h3>
                <ul className="space-y-1 mb-8 text-sm">
                    <li>
                        <Link href="#basics" onClick={() => handleLinkClick("basics")} className={getLinkClass("basics")}>
                            Canvas Basics
                        </Link>
                    </li>
                    <li>
                        <Link href="#properties" onClick={() => handleLinkClick("properties")} className={getLinkClass("properties")}>
                            Properties & Hierarchy
                        </Link>
                    </li>
                </ul>

                <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wider mb-3">Core Engine</h3>
                <ul className="space-y-1 text-sm">
                    <li>
                        <Link href="#relationships" onClick={() => handleLinkClick("relationships")} className={getLinkClass("relationships")}>
                            Relationships
                        </Link>
                    </li>
                    <li>
                        <Link href="#validation" onClick={() => handleLinkClick("validation")} className={getLinkClass("validation")}>
                            Validation Console
                        </Link>
                    </li>
                    <li>
                        <Link href="#export" onClick={() => handleLinkClick("export")} className={getLinkClass("export")}>
                            Exporting Code
                        </Link>
                    </li>
                </ul>
            </aside>

            {/* Backdrop for mobile to close the menu by clicking outside */}
            <label htmlFor="mobile-menu" className="fixed inset-0 bg-black/50 z-40 hidden peer-checked:block md:hidden cursor-pointer"></label>

            {/* Main Content Area */}
            <main className="flex-1 p-6 md:p-12 md:pl-16 max-w-6xl w-full mx-auto">
                {children}
            </main>
        </div>
    );
}