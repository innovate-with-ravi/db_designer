"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return <div className="w-9 h-9" />; // Placeholder to prevent layout shift

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full bg-surface border border-surface-border hover:bg-surface-hover transition-colors flex items-center justify-center"
            title="Toggle Theme"
        >
            {theme === "dark" ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-slate-600" />}
        </button>
    );
}