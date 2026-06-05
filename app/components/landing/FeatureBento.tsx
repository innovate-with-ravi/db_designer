"use client";

import { motion } from "framer-motion";
import { Database, Zap, ShieldCheck, GitMerge } from "lucide-react";

const bentoFeatures = [
    {
        title: "Visual Architecture",
        description: "Drag, drop, and connect entities. Watch your schema take shape in real-time on an infinite canvas.",
        icon: <Database className="text-brand-blue mb-4" size={32} />,
        colSpan: "md:col-span-2",
        delay: 0.1,
        // A visual placeholder for the canvas feature
        visual: (
            <div className="mt-6 h-40 w-full rounded-lg border border-surface-border bg-[#0f1524] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 grid grid-cols-[1rem_1rem] grid-rows-[1rem_1rem] opacity-20" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="w-32 h-12 bg-blue-600/20 border border-blue-500/50 rounded flex items-center justify-center z-10 font-mono text-xs text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.2)]">users_table</div>
                <div className="w-16 h-0.5 bg-gray-600 z-10" />
                <div className="w-32 h-12 bg-emerald-600/20 border border-emerald-500/50 rounded flex items-center justify-center z-10 font-mono text-xs text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]">orders_table</div>
            </div>
        )
    },
    {
        title: "Live SQL Generation",
        description: "Instant, color-coded MySQL generation that updates on every connection.",
        icon: <Zap className="text-brand-emerald mb-4" size={32} />,
        colSpan: "md:col-span-1",
        delay: 0.2,
        visual: (
            <div className="mt-6 h-40 w-full rounded-lg border border-surface-border bg-[#0f1524] p-4 font-mono text-[10px] text-slate-400 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-[#0f1524]" />
                <span className="text-purple-400">CREATE TABLE</span> <span className="text-blue-300">users</span> (<br />
                &nbsp;&nbsp;id <span className="text-emerald-400">VARCHAR(255)</span> <span className="text-orange-300">PRIMARY KEY</span>,<br />
                &nbsp;&nbsp;email <span className="text-emerald-400">VARCHAR(255)</span> <span className="text-orange-300">UNIQUE</span><br />
                );
            </div>
        )
    },
    {
        title: "Zod Gatekeeper",
        description: "Strict schema validation prevents missing primary keys, overlapping cardinalities, and SQL keyword conflicts.",
        icon: <ShieldCheck className="text-orange-400 mb-4" size={32} />,
        colSpan: "md:col-span-1",
        delay: 0.3,
        visual: null // Keeps this card small and focused
    },
    {
        title: "Smart Floating Geometry",
        description: "Our custom math engine automatically routes Bezier curves around your tables, preventing overlapping lines and messy canvases.",
        icon: <GitMerge className="text-purple-400 mb-4" size={32} />,
        colSpan: "md:col-span-2",
        delay: 0.4,
        visual: null
    }
];

export default function FeatureBento() {
    return (
        <section id="features" className="max-w-6xl mx-auto mt-32 py-16">

            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                    Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">build robust schemas.</span>
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Say goodbye to confusing whiteboard drawings and writing DDL statements by hand.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bentoFeatures.map((feature, idx) => (
                    <motion.div
                        key={idx}
                        // whileInView triggers the animation only when the user scrolls down to this section!
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: feature.delay }}
                        className={`bg-surface border border-surface-border hover:bg-surface-hover hover:border-white/20 transition-all duration-300 rounded-3xl p-8 flex flex-col ${feature.colSpan}`}
                    >
                        {feature.icon}
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed flex-1">
                            {feature.description}
                        </p>
                        {feature.visual}
                    </motion.div>
                ))}
            </div>

        </section>
    );
}