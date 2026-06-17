"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Database, Zap } from "lucide-react";

export default function HeroSection({ isAuthenticated, loginAction }: { isAuthenticated: boolean, loginAction: () => void }) {
    return (
        <section className="relative max-w-7xl mx-auto flex flex-col items-center text-center">

            {/* Background Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[300px] md:h-[400px] bg-blue-600/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none overflow-hidden" />

            {/* 1. The Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-surface-border text-brand-blue text-sm font-medium mb-8"
            >
                <Zap size={14} />
                <span>v1.0 is now live</span>
            </motion.div>

            {/* 2. The Headline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="max-w-4xl"
            >
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight text-foreground">
                    Design databases at the speed of <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        thought.
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                    The ultimate visual entity-relationship builder. Draw your schema, auto-resolve cardinalities, and instantly generate production-ready MySQL, Oracle SQL, and Prisma schemas.
                </p>
            </motion.div>

            {/* 3. The CTA Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4"
            >
                {isAuthenticated ? (
                    <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-blue hover:opacity-90 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                        Open Workspace <ArrowRight size={20} />
                    </Link>
                ) : (
                    <form action={loginAction} className="w-full sm:w-auto">
                        <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-foreground hover:opacity-90 text-background px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg">
                            Start Building Free <ArrowRight size={20} />
                        </button>
                    </form>
                )}

                <Link href="/docs" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-surface hover:bg-surface-hover text-foreground border border-surface-border px-8 py-4 rounded-full font-bold text-lg transition-all">
                    Read Docs
                </Link>
            </motion.div>

            {/* 4. The Product Showcase (Video/Image Frame) */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mt-20 w-full max-w-5xl rounded-xl p-2 bg-surface border border-surface-border backdrop-blur-sm relative"
            >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-background border border-surface-border shadow-2xl flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/10 to-brand-emerald/10" />

                    <div className="text-muted-foreground font-mono flex items-center gap-2">
                        <Database size={24} />
                        [ Embed 4K Product Demo Video Here ]
                    </div>
                </div>
            </motion.div>

        </section>
    );
}