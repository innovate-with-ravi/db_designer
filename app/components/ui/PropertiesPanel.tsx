import React from 'react';
import useDiagramStore from '@/store/useDiagramStore';

export default function PropertiesPanel() {
    // 1. Pull the state directly from your global brain
    const { activeExpandedEntityId, setEntityExpanded, nodes } = useDiagramStore();

    // 2. Find the actual data of the entity the user is currently editing
    const activeEntity = nodes.find((n) => n.id === activeExpandedEntityId);


    // 3. The Animation Logic: If there is an active ID, sit at x=0. Otherwise, push it 100% off the right edge.
    const transformClass = activeExpandedEntityId ? 'translate-x-0' : 'translate-x-full';

    return (
        <div
            className={`fixed top-0 right-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 transition-transform duration-300 ease-in-out z-50 flex flex-col ${transformClass}`}
        >
            {/* We only render the form if an entity is successfully found */}
            {activeEntity && (
                <div className="p-6 flex-1 flex flex-col">
                    <div className="border-b pb-4 mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Table: {activeEntity.data?.label}</h2>
                        <p className="text-sm text-gray-500 mt-1">Define hidden attributes</p>
                    </div>

                    {/* The "Smart Row" Prototype (You can have Copilot style this heavily later) */}
                    <div className="flex flex-col gap-3 flex-1">
                        <label className="text-xs font-bold text-gray-600">Column Name</label>
                        <input type="text" placeholder="e.g., user_id" className="border border-gray-300 p-2 rounded outline-none focus:border-blue-500" />

                        <label className="text-xs font-bold text-gray-600 mt-2">Data Type (Top 5)</label>
                        <select className="border border-gray-300 p-2 rounded outline-none focus:border-blue-500">
                            <option>INT</option>
                            <option>VARCHAR</option>
                            <option>TEXT</option>
                            <option>BOOLEAN</option>
                            <option>TIMESTAMP</option>
                        </select>
                    </div>

                    {/* The Action Buttons (Slide the panel out) */}
                    <div className="mt-auto flex gap-3 pt-4 border-t">
                        <button
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                            onClick={() => setEntityExpanded(null)} // Null triggers the slide-out
                        >
                            Save
                        </button>
                        <button
                            className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition"
                            onClick={() => setEntityExpanded(null)} // Null triggers the slide-out
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}