import Link from "next/link";
import { Database } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-surface-border bg-background pt-16 pb-8 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

                {/* Brand Column */}
                <div className="md:col-span-1 flex flex-col items-start">
                    <div className="font-bold text-xl tracking-tighter flex items-center gap-2 mb-4">
                        <Database className="text-brand-blue" />
                        DB Designer
                    </div>
                    <p className="text-slate-500 text-sm mb-6">
                        The ultimate visual entity-relationship builder for modern full-stack teams.
                    </p>
                    <div className="flex gap-4 text-slate-400">
                        <Link href="#" className="hover:text-brand-blue transition-colors">
                            {/* <Twitter size={20} /> */}
                            Twitter
                        </Link>
                        <Link href="#" className="hover:text-brand-blue transition-colors">
                            {/* <Github size={20} /> */}
                            Github
                        </Link>
                    </div>
                </div>

                {/* Links Columns */}
                <div>
                    <h4 className="font-bold mb-4 text-foreground">Product</h4>
                    <ul className="space-y-2 text-sm text-slate-500">
                        <li><Link href="#features" className="hover:text-brand-blue transition-colors">Features</Link></li>
                        <li><Link href="/docs" className="hover:text-brand-blue transition-colors">Documentation</Link></li>
                        <li><Link href="/dashboard" className="hover:text-brand-blue transition-colors">Workspace</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-4 text-foreground">Resources</h4>
                    <ul className="space-y-2 text-sm text-slate-500">
                        <li><Link href="#" className="hover:text-brand-blue transition-colors">Database Design Guide</Link></li>
                        <li><Link href="#" className="hover:text-brand-blue transition-colors">Prisma Integration</Link></li>
                        <li><Link href="#" className="hover:text-brand-blue transition-colors">Changelog</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-4 text-foreground">Legal</h4>
                    <ul className="space-y-2 text-sm text-slate-500">
                        <li><Link href="#" className="hover:text-brand-blue transition-colors">Privacy Policy</Link></li>
                        <li><Link href="#" className="hover:text-brand-blue transition-colors">Terms of Service</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto pt-8 border-t border-surface-border text-center text-sm text-slate-500">
                &copy; {new Date().getFullYear()} DB Designer. All rights reserved.
            </div>
        </footer>
    );
}