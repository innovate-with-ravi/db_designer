"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Database, Zap } from "lucide-react";

export default function HeroSection({ isAuthenticated, loginAction }: { isAuthenticated: boolean, loginAction: () => void }) {
    return (
        <section className="relative max-w-7xl mx-auto flex flex-col items-center text-center">

            {/* Background Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
            {/* <BackgroundGradientAnimationDemo /> */}

            {/* 1. The Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm font-medium mb-8"
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
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                    Design databases at the speed of <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        thought.
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                    The ultimate visual entity-relationship builder. Draw your schema, auto-resolve cardinalities, and generate production-ready MySQL instantly.
                </p>
            </motion.div>

            {/* 3. The CTA Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center gap-4"
            >
                {isAuthenticated ? (
                    <Link href="/dashboard" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                        Open Workspace <ArrowRight size={20} />
                    </Link>
                ) : (
                    <form action={loginAction}>
                        <button type="submit" className="flex items-center gap-2 bg-white hover:bg-slate-200 text-black px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                            Start Building Free <ArrowRight size={20} />
                        </button>
                    </form>
                )}

                <Link href="/docs" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-full font-bold text-lg transition-all">
                    Read Docs
                </Link>
            </motion.div>

            {/* 4. The Product Showcase (Video/Image Frame) */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mt-20 w-full max-w-5xl rounded-xl p-2 bg-white/5 border border-white/10 backdrop-blur-sm relative"
            >
                {/* 🌟 YOUR TASK: Record a 15-second screen recording of you dragging tables, 
                    connecting them with the curved lines, and clicking "Generate SQL". 
                    Save it as demo.mp4 in your /public folder! */}

                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#0B0F19] border border-white/5 shadow-2xl flex items-center justify-center">
                    {/* Placeholder until you add the video */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-emerald-900/20" />

                    {/* Uncomment this when you have the video! 
                    <video 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                    >
                        <source src="/demo.mp4" type="video/mp4" />
                    </video>
                    */}

                    <div className="text-slate-500 font-mono flex items-center gap-2">
                        <Database size={24} />
                        [ Embed 4K Product Demo Video Here ]
                    </div>
                </div>
            </motion.div>

        </section>
    );
}