import Link from 'next/link';
import { getUserDiagrams } from '@/action/loadDiagram';

import type { Metadata, ResolvingMetadata } from 'next'
import { auth } from '@/auth';
import Navbar from '../components/layout/Navbar';
import DeleteProjectButton from '@/app/components/ui/DeleteProjectButton';

export async function generateMetadata(parent: ResolvingMetadata): Promise<Metadata> {
    const session = await auth()

    return {
        title: `${session?.user?.name}'s dashboard`,
        description: `View and manage your database diagrams — create, edit, and organize your projects in one place.`
    }
}

export default async function DashboardPage() {
    // 1. Fetch data directly on the server
    const response = await getUserDiagrams();

    // 2. Handle unauthorized or error states
    if (!response.success || !response.diagrams) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-muted-foreground transition-colors duration-300">
                <p>Please log in to view your dashboard.</p>
            </div>
        );
    }

    const diagrams = response.diagrams;

    return (
        <div className="min-h-screen bg-background p-4 sm:p-10 pt-24 sm:pt-32 transition-colors duration-300">
            {/* 🌟 The Universal Navbar */}
            <Navbar isLandingPage={false} />

            <div className="max-w-6xl mx-auto">
                {/* Local Dashboard Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground transition-colors">Your Projects</h1>
                        <p className="text-muted-foreground mt-1 text-sm sm:text-base transition-colors">Manage and edit your database schemas.</p>
                    </div>

                    {/* New Diagram Button */}
                    <Link
                        href="/editor/new"
                        className="w-full sm:w-auto text-center bg-brand-blue text-white px-6 py-3 rounded-lg font-bold shadow-md hover:opacity-90 transition-all"
                    >
                        + New Diagram
                    </Link>
                </div>

                {/* The Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {diagrams.length === 0 ? (
                        <div className="col-span-full p-10 text-center border-2 border-dashed border-surface-border rounded-xl text-muted-foreground transition-colors">
                            No diagrams yet. Create your first database design!
                        </div>
                    ) : (
                        diagrams.map((diagram) => (
                            <Link href={`/editor/${diagram.id}`} key={diagram.id} className="relative block h-full">

                                {/* 🌟 The Micro Client Component */}
                                <DeleteProjectButton diagramId={diagram.id} diagramTitle={diagram.title} />

                                <div className="bg-surface p-6 rounded-xl shadow-sm border border-surface-border hover:shadow-lg hover:border-brand-blue/50 transition-all cursor-pointer group flex flex-col h-full">
                                    <h3 className="text-xl font-bold pr-8 text-foreground group-hover:text-brand-blue transition-colors">
                                        {diagram.title}
                                    </h3>

                                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground transition-colors">
                                        <span className="flex items-center gap-1">
                                            📦 {diagram._count.nodes} Tables
                                        </span>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-surface-border text-xs text-muted-foreground/70 transition-colors">
                                        Last updated: {new Date(diagram.updatedAt).toLocaleString()}
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}