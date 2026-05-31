import React from 'react';
import useDiagramStore from '@/store/useDiagramStore';

export default function PropertiesPanel() {
    // Pull the state directly from your global brain
    const { nodes, edges, activeExpandedEntityId, setEntityExpanded, updateNodeData } = useDiagramStore();

    // Find the actual data of the entity the user is currently editing
    const activeEntity = nodes.find((n) => n.id === activeExpandedEntityId);

    // Hunt down the visual attributes connected to this entity
    const visualAttributes = edges
        .filter(edge => edge.source === activeExpandedEntityId || edge.target === activeExpandedEntityId)// filter edges connected to activeEntity
        .map(edge => {
            const connectedNodeId = edge.source === activeExpandedEntityId ? edge.target : edge.source;
            return nodes.find(n => n.id === connectedNodeId);
        })// store all the nodes connected to activeEntity
        .filter(node => node?.type === 'attribute'); // Ensure we only get attributes, not other entities

    // Safely grab the hidden attributes
    const hiddenAttributes = (activeEntity?.data?.hiddenAttributes as any[]) || [];

    const allAttr = [...visualAttributes, ...hiddenAttributes] as any[];

    // Inside PropertiesPanel.tsx (Data Fetching Section)

    // 1. Is there a visual PK physically attached to this entity?
    const visualKeyNode = visualAttributes.find(attr => attr?.id === activeEntity?.data.primaryKey);
    console.log(visualKeyNode)

    // 2. Filter hidden attributes (Assuming your hidden attributes might have an 'attributeType' later, 
    // but for now we just map them since they act as simple attributes by default)
    const validHiddenAttributes = hiddenAttributes.filter(attr =>
        attr.attributeType !== 'derived' && attr.attributeType !== 'multi-valued'
    );

    // The Animation Logic: We use negative margins instead of 'fixed' positioning 
    // so it stays inside the top Flex row and never overlaps the bottom console!
    const transformClass = activeExpandedEntityId ? 'mr-0' : '-mr-80';

    return (
        <div
            className={`w-80 h-full flex-shrink-0 bg-white shadow-2xl border-l border-gray-200 transition-all duration-300 ease-in-out z-40 flex flex-col ${transformClass}`}
        >
            {/* We only render the form if an entity is successfully found */}
            {activeEntity && (
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                    <div className="border-b pb-4 mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Table: {activeEntity.data?.label as string}</h2>
                    </div>

                    <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-md">
                        <label className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 block">
                            Primary Key 🔑
                        </label>

                        {visualKeyNode ? (
                            /* State A: A visual key is attached on the canvas */
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white p-2 border border-blue-200 rounded cursor-not-allowed">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {visualKeyNode.data.label as any || 'Unnamed Key Node'}
                                <span className="text-xs text-gray-400 font-normal ml-auto italic">(Canvas Node)</span>
                            </div>
                        ) : (
                            /* State B: No visual key. Show the dropdown of hidden attributes! */
                            <select
                                className="w-full p-2 border border-blue-200 rounded outline-none bg-white text-sm focus:border-blue-500"
                                // We read/write a single string directly to the active entity's data!
                                value={activeEntity.data.primaryKey as string || ''}
                                onChange={(e) => updateNodeData(activeEntity.id, { primaryKey: e.target.value })}
                            >
                                <option value="">-- Select a hidden attribute --</option>
                                {validHiddenAttributes.map((attr, index) => (
                                    <option key={index} value={attr.name}>
                                        {attr.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* The "Smart Row" Prototype (You can have Copilot style this heavily later) */}
                    <h3 className="font-bold text-gray-700">Visual Attributes</h3>
                    {visualAttributes.map((attr) => (
                        <div key={attr?.id} className="border p-2 mb-2">
                            <p className="font-semibold">{attr?.data.label as string}</p>

                            <select
                                className={`border p-1 rounded outline-none w-full mb-2 ${!attr?.data?.dataType ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                value={attr?.data.dataType as string || ''}
                                onChange={(e) => updateNodeData(attr?.id as string, { dataType: e.target.value })}
                            >
                                <option value="">Select Type...</option>
                                <option value="INT">INT</option>
                                <option value="VARCHAR">VARCHAR</option>
                            </select>

                            {/* Only show Size input if they selected VARCHAR */}
                            {attr?.data.dataType === 'VARCHAR' && (
                                <input
                                    type="number"
                                    placeholder="Size (e.g. 255)"
                                    className={`${(attr?.data.dataType === 'VARCHAR' && !attr?.data?.size) ? 'border-red-500 border bg-red-50' : 'border-gray-300'} focus-visible:outline-none`}
                                    value={attr?.data.size as string || ''}
                                    onChange={(e) => updateNodeData(attr?.id, { size: e.target.value })}
                                />
                            )}
                        </div>
                    ))}

                    <h3 className="font-bold text-gray-700 mt-4">Hidden Attributes</h3>
                    {hiddenAttributes.map((hiddenAttr: any, index: any) => (
                        <div key={index} className="border p-4 mb-2 relative">
                            <div
                                className="text-red-800 font-bold text-2xl cursor-pointer absolute -top-1 right-1"
                                onClick={(e) => {
                                    const newArray = hiddenAttributes.filter(attr => attr.name != hiddenAttr.name);
                                    updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                }}>&times;</div>
                            {/* Name Input */}
                            <input
                                type="text"
                                className="border border-gray-300 p-1 rounded outline-none mb-2 w-full"
                                value={hiddenAttr.name}
                                onChange={(e) => {
                                    const newArray = [...hiddenAttributes];
                                    newArray[index].name = e.target.value;
                                    updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                }}
                            />

                            {/* DataType Dropdown */}
                            <select
                                className={`border p-1 rounded outline-none w-full mb-2 ${!hiddenAttr.dataType ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                value={hiddenAttr.dataType || ''}
                                onChange={(e) => {
                                    // Replaced updateNodeData with the correct array-copy logic
                                    const newArray = [...hiddenAttributes];
                                    newArray[index].dataType = e.target.value;
                                    updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                }}
                            >
                                <option value="">Select Type...</option>
                                <option value="INT">INT</option>
                                <option value="VARCHAR">VARCHAR</option>
                            </select>

                            {/* Size Input */}
                            {hiddenAttr.dataType === 'VARCHAR' && ( // Removed .data
                                <input
                                    type="number"
                                    className="border border-gray-300 p-1 rounded outline-none w-full"
                                    placeholder="Size (e.g. 255)"
                                    value={hiddenAttr.size || ''} // Removed .data
                                    onChange={(e) => {
                                        // Replaced updateNodeData with the correct array-copy logic
                                        const newArray = [...hiddenAttributes];
                                        newArray[index].size = e.target.value;
                                        updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                    }}
                                />
                            )}
                        </div>
                    ))}

                    {/* The Button to Add a New Hidden Attribute */}
                    <button className="bg-blue-200 text-white px-1 rounded  hover:bg-blue-300 transition"
                        onClick={() => {
                            const newArray = [...hiddenAttributes, { name: 'new_column', dataType: '', size: '' }];
                            updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                        }}
                    >
                        + Add Hidden Attribute
                    </button>

                    {/* The Action Buttons (Slide the panel out) */}
                    <div className="mt-auto flex gap-3 pt-4 border-t">
                        <button
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition"
                            onClick={() => setEntityExpanded(null)} // This just slides the panel away!
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}