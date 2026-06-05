"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // ✅ Remove the mounted state. next-themes handles this internally.
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange // Highly recommended to prevent transition flashes
        >
            {children}
        </NextThemesProvider>
    );
}
