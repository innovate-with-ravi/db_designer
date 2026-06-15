import React, { useEffect, useState } from 'react';
import useDiagramStore from '@/store/useDiagramStore';

export default function PropertiesPanel() {
    const { nodes, edges, activeExpandedEntityId, setEntityExpanded, updateNodeData } = useDiagramStore();

    const activeEntity = nodes.find((n) => n.id === activeExpandedEntityId);

    // 🌟 ADDED: State to track which Composite Attributes are collapsed
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

    const toggleCollapse = (nodeId: string) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) newSet.delete(nodeId);
            else newSet.add(nodeId);
            return newSet;
        });
    };

    // Graph Traversal Engine
    const getAllAttributesForEntity = (entityId: string) => {
        const result: any[] = [];
        const visited = new Set<string>();

        const traverse = (currentNodeId: string, depth = 0) => {
            if (visited.has(currentNodeId)) return;
            visited.add(currentNodeId);

            const connectedEdges = edges.filter(e => e.source === currentNodeId || e.target === currentNodeId);

            connectedEdges.forEach(edge => {
                const otherNodeId = edge.source === currentNodeId ? edge.target : edge.source;
                const otherNode = nodes.find(n => n.id === otherNodeId);

                if (otherNode && otherNode.type === 'attribute' && !visited.has(otherNodeId)) {
                    result.push({ ...otherNode, depth });

                    // 🌟 ADDED: Stop tracing the graph if this parent is collapsed
                    if (!collapsedNodes.has(otherNodeId)) {
                        traverse(otherNodeId, depth + 1);
                    }
                }
            });
        };

        traverse(entityId);
        return result;
    };

    const visualAttributes = activeExpandedEntityId ? getAllAttributesForEntity(activeExpandedEntityId) : [];
    const hiddenAttributes = (activeEntity?.data?.hiddenAttributes as any[]) || [];

    const visualKeyNode = visualAttributes.find(attr => attr?.id === activeEntity?.data.primaryKey);

    // Prevents making derived or multi-valued columns the Primary Key
    const validHiddenAttributes = hiddenAttributes.filter(attr =>
        attr.attributeType !== 'derived' && attr.attributeType !== 'multi-valued'
    );

    const transformClass = activeExpandedEntityId ? 'mr-0' : '-mr-96'; // Made panel slightly wider (mr-96) for better spacing

    useEffect(() => {
        if (!nodes.some((n) => n.id == activeExpandedEntityId))
            setEntityExpanded(null)
    }, [activeExpandedEntityId, nodes, setEntityExpanded])

    return (
        <div className={`w-90 h-full flex-shrink-0 bg-surface shadow-2xl border-l border-surface-border transition-all duration-300 ease-in-out z-40 flex flex-col ${transformClass}`}>
            {activeEntity && (
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">

                    <div className="border-b border-surface-border pb-4 mb-5">
                        <h2 className="text-xl font-bold text-foreground truncate">Table: {activeEntity.data?.label as string}</h2>
                    </div>

                    {/* Primary Key Selector */}
                    <div className="mb-6 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-lg">
                        <label className="text-[11px] font-bold text-brand-blue uppercase tracking-wider mb-2 block">
                            Primary Key 🔑
                        </label>
                        {visualKeyNode ? (
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-background p-2 border border-surface-border rounded-md cursor-not-allowed">
                                <span className="w-2 h-2 rounded-full bg-brand-blue"></span>
                                <span className="truncate">{visualKeyNode.data.label as any || 'Unnamed'}</span>
                                <span className="text-[10px] text-muted-foreground font-normal ml-auto italic border border-border px-1.5 rounded-sm">(Canvas)</span>
                            </div>
                        ) : (
                            <select
                                className="w-full p-2 border border-surface-border rounded-md outline-none bg-background text-foreground text-sm focus:border-brand-blue transition-colors"
                                value={activeEntity.data.primaryKey as string || ''}
                                onChange={(e) => updateNodeData(activeEntity.id, { primaryKey: e.target.value })}
                            >
                                <option className='bg-background text-foreground' value="">-- Select hidden attribute --</option>
                                {validHiddenAttributes.map((attr, index) => (
                                    <option className='bg-background text-foreground' key={index} value={attr.name}>
                                        {attr.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide text-muted-foreground">Visual Attributes</h3>

                    {/* 🌟 HIERARCHICAL VISUAL ATTRIBUTES */}
                    <div className="flex flex-col gap-3 mb-8">
                        {visualAttributes.map((attr) => {
                            const indentLevel = attr.depth || 0;

                            return (
                                <div key={attr?.id} className="flex w-full relative">

                                    {/* Using your exact vertical lines UI */}
                                    {Array.from({ length: indentLevel }).map((_, i) => (
                                        <div key={i} className="w-5 border-l-2 border-surface-border/50 ml-2 relative shrink-0">
                                            {/* Draw the horizontal branch connecting to the card */}
                                            {i === indentLevel - 1 && (
                                                <div className="absolute top-6 left-0 w-full border-t-2 border-surface-border/50" />
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex-1 border border-surface-border bg-background p-3 rounded-lg shadow-sm relative">
                                        <div className={`flex items-center justify-between ${(attr.data.attributeType != 'composite') ? "mb-3" : ''}`}>

                                            {/* 🌟 ADDED: The shrink/expand toggle button next to the label */}
                                            <div className="flex items-center gap-1 overflow-hidden pr-2">
                                                {String(attr?.data?.attributeType).toLowerCase() === 'composite' && (
                                                    <button
                                                        onClick={() => toggleCollapse(attr?.id)}
                                                        className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] w-4 flex items-center justify-center"
                                                    >
                                                        {collapsedNodes.has(attr?.id) ? '▶' : '▼'}
                                                    </button>
                                                )}
                                                <p className="font-semibold text-foreground text-sm truncate">{attr?.data.label as string}</p>
                                            </div>

                                            {/* Read-Only Badge instead of messy dropdown */}
                                            <span className="text-[9px] uppercase font-bold tracking-wider bg-surface border border-surface-border text-muted-foreground rounded px-1.5 py-0.5">
                                                {attr?.data.attributeType || 'simple'}
                                            </span>
                                        </div>

                                        {/* datatype & size selector */}
                                        {attr.data.attributeType != 'composite' && (
                                            <div className="flex gap-2">
                                                <select
                                                    className={`flex-1 border p-1.5 text-xs rounded-md outline-none text-foreground transition-colors ${!attr?.data?.dataType && String(attr?.data?.attributeType).toLowerCase() !== 'composite' ? 'border-destructive bg-destructive/10' : 'border-surface-border bg-surface hover:border-brand-blue/50'}`}
                                                    value={attr?.data.dataType as string || ''}
                                                    onChange={(e) => updateNodeData(attr?.id as string, { dataType: e.target.value })}
                                                    disabled={String(attr?.data?.attributeType).toLowerCase() === 'composite'}
                                                >
                                                    <option className='bg-background text-foreground' value="">DataType</option>
                                                    <option className='bg-background text-foreground' value="INT">INT</option>
                                                    <option className='bg-background text-foreground' value="VARCHAR">VARCHAR</option>
                                                </select>

                                                <input
                                                    type="number"
                                                    placeholder="Size"
                                                    className={`w-16 p-1.5 text-xs rounded-md text-foreground border transition-colors focus:outline-none focus:ring-1 focus:ring-brand-blue 
                                                    ${(!attr?.data?.size && attr?.data?.dataType === 'VARCHAR') ? 'border-destructive bg-destructive/10' : 'border-surface-border bg-surface hover:border-brand-blue/50'}`}
                                                    value={attr?.data.size as string || ''}
                                                    onChange={(e) => updateNodeData(attr?.id, { size: e.target.value })}
                                                    disabled={String(attr?.data?.attributeType).toLowerCase() === 'composite' || attr?.data?.dataType !== 'VARCHAR'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide text-muted-foreground">Hidden Attributes</h3>

                    <div className="flex flex-col gap-4">
                        {hiddenAttributes.map((hiddenAttr: any, index: any) => (
                            <div key={index} className="border border-surface-border bg-background p-4 relative rounded-lg shadow-sm group">

                                {/* Delete Button */}
                                <button
                                    className="text-muted-foreground hover:text-destructive transition-colors absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100"
                                    onClick={() => {
                                        const newArray = hiddenAttributes.filter(attr => attr.name != hiddenAttr.name);
                                        updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>

                                {/* Name & Type Row */}
                                <div className="flex gap-2 mb-3 pr-6">
                                    <input
                                        type="text"
                                        placeholder="Column Name"
                                        className="flex-1 border border-surface-border font-semibold bg-surface text-foreground p-1.5 text-sm rounded-md outline-none focus:ring-1 focus:ring-brand-blue transition-all"
                                        value={hiddenAttr.name}
                                        onChange={(e) => {
                                            const newArray = [...hiddenAttributes];
                                            newArray[index].name = e.target.value;
                                            updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                        }}
                                    />

                                    {/* Clean Hidden Attribute Type Selector */}
                                    <select
                                        className="w-20 text-[8px] uppercase font-bold tracking-wider bg-surface border border-surface-border text-muted-foreground rounded-md p-1.5 outline-none focus:ring-1 focus:ring-brand-blue transition-all cursor-pointer"
                                        value={hiddenAttr.attributeType || 'simple'}
                                        onChange={(e) => {
                                            const newArray = [...hiddenAttributes];
                                            newArray[index].attributeType = e.target.value;
                                            updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                        }}
                                    >
                                        <option className='bg-background text-foreground' value="simple">Simple</option>
                                        <option className='bg-background text-foreground' value="multi-valued">Multi-Valued</option>
                                        <option className='bg-background text-foreground' value="derived">Derived</option>
                                    </select>
                                </div>

                                {/* DataType & Size Row */}
                                <div className="flex gap-2">
                                    <select
                                        className={`flex-1 border p-1.5 text-xs rounded-md outline-none text-foreground transition-colors ${!hiddenAttr.dataType ? 'border-destructive bg-destructive/10' : 'border-surface-border bg-surface focus:ring-1 focus:ring-brand-blue'}`}
                                        value={hiddenAttr.dataType || ''}
                                        onChange={(e) => {
                                            const newArray = [...hiddenAttributes];
                                            newArray[index].dataType = e.target.value;
                                            updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                        }}
                                    >
                                        <option className='bg-background text-foreground' value="">DataType</option>
                                        <option className='bg-background text-foreground' value="INT">INT</option>
                                        <option className='bg-background text-foreground' value="VARCHAR">VARCHAR</option>
                                    </select>

                                    <input
                                        type="number"
                                        className={`w-16 p-1.5 text-xs rounded-md text-foreground border transition-colors focus:outline-none focus:ring-1 focus:ring-brand-blue 
                                            ${(!hiddenAttr.size && hiddenAttr.dataType === 'VARCHAR') ? 'border-destructive bg-destructive/10' : 'border-surface-border bg-surface'}`}
                                        placeholder="Size"
                                        value={hiddenAttr.size || ''}
                                        onChange={(e) => {
                                            const newArray = [...hiddenAttributes];
                                            newArray[index].size = e.target.value;
                                            updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                        }}
                                        disabled={hiddenAttr.dataType !== 'VARCHAR'}
                                    />
                                </div>
                            </div>
                        ))}

                        <button className="bg-surface border border-dashed border-surface-border text-muted-foreground hover:text-foreground text-sm font-semibold px-4 py-3 rounded-lg hover:bg-surface-hover transition-all flex items-center justify-center gap-2"
                            onClick={() => {
                                const newArray = [...hiddenAttributes, { name: 'new_column', dataType: '', size: '', attributeType: 'simple' }];
                                updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            Add Hidden Attribute
                        </button>
                    </div>

                    <div className="mt-auto pt-8 pb-2">
                        <button
                            className="w-full bg-brand-blue text-white px-4 py-2.5 rounded-lg font-bold hover:opacity-90 shadow-md transition-all"
                            onClick={() => setEntityExpanded(null)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}