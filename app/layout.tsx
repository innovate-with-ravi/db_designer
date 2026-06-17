import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";

export const metadata: Metadata = {
  title: 'DB Designer | Visual Schema Compiler',
  description: 'The ultimate visual entity-relationship builder. Draw your schema, auto-resolve cardinalities, and generate production-ready MySQL, Oracle, and Prisma schemas instantly.',
  keywords: ['Database Design', 'ER Diagram', 'SQL Generator', 'Prisma Schema', 'Database Compiler'],
  authors: [{ name: 'Ravi Bhawsar' }],
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'DB Designer | Visual Schema Compiler',
    description: 'Design databases at the speed of thought. Generate MySQL, Oracle, and Prisma schemas instantly from visual ER diagrams.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}