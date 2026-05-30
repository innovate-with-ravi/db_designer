import React from 'react';
import { useReactFlow } from '@xyflow/react';
import useDiagramStore from '@/store/useDiagramStore';

export default function ValidationConsole() {
    const { globalErrors, setGlobalErrors, setEntityExpanded, nodes, setActiveErrorNodeId } = useDiagramStore();
    const { setCenter } = useReactFlow(); // React Flow's camera hook!

    const isOpen = globalErrors.length > 0;

    const handleFixClick = (nodeId: string | null) => {
        if (!nodeId) return;

        // 1. Find the broken node
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // 2. Pan and Zoom the camera right to it!
        setCenter(node.position.x + 200, node.position.y + 24, { zoom: 1.2, duration: 800 });

        // 3. Auto-open the Properties Panel so they can fix it
        setEntityExpanded(nodeId);

        // 3. Trigger the Red Glow Target Lock!
        setActiveErrorNodeId(nodeId);

        // 4. Turn the glow off after 3 seconds
        setTimeout(() => {
            setActiveErrorNodeId(null);
        }, 3000);
    };

    return (
        <div
            className={`fixed bottom-0 left-0 w-full bg-red-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t-4 border-red-500 transform transition-transform duration-300 ease-in-out z-[250] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ height: '25vh' }} // Takes up bottom quarter of the screen
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-2 px-6 bg-red-100 border-b border-red-200">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🛑</span>
                        <h2 className="font-bold text-red-900">Compilation Errors ({globalErrors.length})</h2>
                    </div>
                    <button onClick={() => {
                        setGlobalErrors([])
                        setEntityExpanded(null)
                    }} className="text-red-500 font-bold hover:text-red-800">&times;</button>
                </div>

                {/* Error List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {globalErrors.map((error, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-red-200 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2 text-sm text-gray-800">
                                <span className="text-red-500 font-bold">•</span>
                                <span>{error.message}</span>
                            </div>
                            {error.nodeId && (
                                <button
                                    onClick={() => handleFixClick(error.nodeId)}
                                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 transition-colors"
                                >
                                    Focus & Fix 🎯
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}