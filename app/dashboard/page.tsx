import Link from 'next/link';
import { getUserDiagrams } from '@/action/loadDiagram';

import type { Metadata, ResolvingMetadata } from 'next'
import { auth } from '@/auth';


export async function generateMetadata(parent: ResolvingMetadata): Promise<Metadata> {

    const session = await auth()

    return {
        title: `${session?.user?.name}'s dashboard`,
        description: `View and manage your database diagrams — create, edit, and organize your projects in one place.`
    }
}

export default async function DashboardPage() {
    // 1. Fetch data directly on the next's server(or deployed server) from DB's server
    const response = await getUserDiagrams();

    // 2. Handle unauthorized or error states
    if (!response.success || !response.diagrams) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-600">
                <p>Please log in to view your dashboard.</p>
            </div>
        );
    }

    const diagrams = response.diagrams;

    return (
        <div className="min-h-screen bg-gray-50 p-10">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
                        <p className="text-gray-500 mt-1">Manage and edit your database schemas.</p>
                    </div>
                    {/* The "New Project" Button routes to the special 'new' ID */}
                    <Link
                        href="/editor/new"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition"
                    >
                        + New Diagram
                    </Link>
                </div>

                {/* The Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {diagrams.length === 0 ? (
                        <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-300 rounded-xl text-gray-500">
                            No diagrams yet. Create your first database design!
                        </div>
                    ) : (
                        diagrams.map((diagram) => (
                            <Link href={`/editor/${diagram.id}`} key={diagram.id}>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-400 transition cursor-pointer group flex flex-col h-full">
                                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">
                                        {diagram.title}
                                    </h3>

                                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            📦 {diagram._count.nodes} Tables & Attributes
                                        </span>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-100 text-xs text-gray-400">
                                        Last updated: {new Date(diagram.updatedAt).toLocaleDateString()}
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