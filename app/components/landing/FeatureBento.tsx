"use client";

import { motion } from "framer-motion";
import { Database, Zap, ShieldCheck, GitMerge } from "lucide-react";

const bentoFeatures = [
    {
        title: "Visual Architecture",
        description: "Design with precision. Support for Simple, Key, Composite, Derived, and Multi-Valued attributes directly on an infinite canvas.",
        icon: <Database className="text-brand-blue mb-4" size={32} />,
        colSpan: "md:col-span-2",
        delay: 0.1,
        visual: (
            <div className="mt-6 h-40 w-full rounded-lg border border-surface-border bg-muted relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 grid grid-cols-[1rem_1rem] grid-rows-[1rem_1rem] opacity-20" style={{ backgroundImage: 'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="w-32 h-12 bg-brand-blue/20 border border-brand-blue/50 rounded-lg flex items-center justify-center z-10 font-mono text-xs text-brand-blue shadow-[0_0_15px_rgba(37,99,235,0.2)]">CUSTOMER</div>
                <div className="w-16 h-0.5 bg-muted-foreground/50 z-10" />
                <div className="w-32 h-12 bg-brand-emerald/20 border border-brand-emerald/50 rounded-lg flex items-center justify-center z-10 font-mono text-xs text-brand-emerald shadow-[0_0_15px_rgba(52,211,153,0.2)]">address</div>
            </div>
        )
    },
    {
        title: "Multi-Dialect Export",
        description: "Instantly compile your visual diagram into raw MySQL, strict Oracle SQL, or full-stack Prisma ORM schemas.",
        icon: <Zap className="text-brand-emerald mb-4" size={32} />,
        colSpan: "md:col-span-1",
        delay: 0.2,
        visual: (
            <div className="mt-6 h-40 w-full rounded-lg border border-surface-border bg-muted p-4 font-mono text-[10px] text-muted-foreground overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-muted" />
                <span className="text-purple-500">model</span> <span className="text-brand-blue">USER</span> &#123;<br />
                &nbsp;&nbsp;id <span className="text-brand-emerald">Int</span> <span className="text-orange-500">@id</span><br />
                &nbsp;&nbsp;email <span className="text-brand-emerald">String</span> <span className="text-orange-500">@unique</span><br />
                &nbsp;&nbsp;profile <span className="text-brand-emerald">PROFILE[]</span><br />
                &#125;
            </div>
        )
    },
    {
        title: "Smart Validation Engine",
        description: "Our Zod gatekeeper catches missing data types, duplicate columns, and SQL reserved word conflicts. Click 'Focus & Fix' to instantly zoom to the error.",
        icon: <ShieldCheck className="text-orange-500 mb-4" size={32} />,
        colSpan: "md:col-span-1",
        delay: 0.3,
        visual: null
    },
    {
        title: "Autonomous Normalization",
        description: "Don't worry about Junction Tables or 1NF. The AST compiler automatically extracts M:N relationships and Multi-Valued attributes into perfectly linked sub-tables.",
        icon: <GitMerge className="text-purple-500 mb-4" size={32} />,
        colSpan: "md:col-span-2",
        delay: 0.4,
        visual: null
    }
];

export default function FeatureBento() {
    return (
        <section id="features" className="max-w-6xl mx-auto mt-20 py-16">

            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
                    Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">build robust schemas.</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Say goodbye to confusing whiteboard drawings and writing DDL statements by hand.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {bentoFeatures.map((feature, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5, delay: feature.delay }}
                        className={`bg-surface border border-surface-border hover:bg-surface-hover hover:border-foreground/20 transition-all duration-300 rounded-3xl p-8 flex flex-col ${feature.colSpan}`}
                    >
                        {feature.icon}
                        <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                            {feature.description}
                        </p>
                        {feature.visual}
                    </motion.div>
                ))}
            </div>

        </section>
    );
}