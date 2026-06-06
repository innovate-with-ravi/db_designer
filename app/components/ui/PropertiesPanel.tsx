import React, { useEffect } from 'react';
import useDiagramStore from '@/store/useDiagramStore';

export default function PropertiesPanel() {
    const { nodes, edges, activeExpandedEntityId, setEntityExpanded, updateNodeData } = useDiagramStore();

    const activeEntity = nodes.find((n) => n.id === activeExpandedEntityId);

    const visualAttributes = edges
        .filter(edge => edge.source === activeExpandedEntityId || edge.target === activeExpandedEntityId)
        .map(edge => {
            const connectedNodeId = edge.source === activeExpandedEntityId ? edge.target : edge.source;
            return nodes.find(n => n.id === connectedNodeId);
        })
        .filter(node => node?.type === 'attribute');

    const hiddenAttributes = (activeEntity?.data?.hiddenAttributes as any[]) || [];
    const allAttr = [...visualAttributes, ...hiddenAttributes] as any[];

    const visualKeyNode = visualAttributes.find(attr => attr?.id === activeEntity?.data.primaryKey);

    const validHiddenAttributes = hiddenAttributes.filter(attr =>
        attr.attributeType !== 'derived' && attr.attributeType !== 'multi-valued'
    );

    const transformClass = activeExpandedEntityId ? 'mr-0' : '-mr-80';

    useEffect(() => {
        if (!nodes.some((n) => n.id == activeExpandedEntityId))
            setEntityExpanded(null)
    }, [activeExpandedEntityId, nodes, setEntityExpanded])

    return (
        <div
            className={`w-80 h-full flex-shrink-0 bg-surface shadow-2xl border-l border-surface-border transition-all duration-300 ease-in-out z-40 flex flex-col ${transformClass}`}
        >
            {activeEntity && (
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                    <div className="border-b border-surface-border pb-4 mb-4">
                        <h2 className="text-xl font-bold text-foreground">Table: {activeEntity.data?.label as string}</h2>
                    </div>

                    <div className="mb-6 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-md">
                        <label className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-2 block">
                            Primary Key 🔑
                        </label>

                        {visualKeyNode ? (
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-background p-2 border border-surface-border rounded cursor-not-allowed">
                                <span className="w-2 h-2 rounded-full bg-brand-blue"></span>
                                {visualKeyNode.data.label as any || 'Unnamed Key Node'}
                                <span className="text-xs text-muted-foreground font-normal ml-auto italic">(Canvas Node)</span>
                            </div>
                        ) : (
                            <select
                                className="w-full p-2 border border-surface-border rounded outline-none bg-background text-foreground text-sm focus:border-brand-blue"
                                value={activeEntity.data.primaryKey as string || ''}
                                onChange={(e) => updateNodeData(activeEntity.id, { primaryKey: e.target.value })}
                            >
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="">-- Select a hidden attribute --</option>
                                {validHiddenAttributes.map((attr, index) => (
                                    <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' key={index} value={attr.name}>
                                        {attr.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <h3 className="font-bold text-foreground">Visual Attributes</h3>
                    {visualAttributes.map((attr) => (
                        <div key={attr?.id} className="border border-surface-border bg-background p-2 mb-2 rounded">
                            <p className="font-semibold text-foreground">{attr?.data.label as string}</p>

                            <select
                                className={`border p-1 rounded outline-none w-full mb-2 text-foreground ${!attr?.data?.dataType ? 'border-destructive bg-destructive/10' : 'border-surface-border bg-surface'}`}
                                value={attr?.data.dataType as string || ''}
                                onChange={(e) => updateNodeData(attr?.id as string, { dataType: e.target.value })}
                            >
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="">Select Type...</option>
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="INT">INT</option>
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="VARCHAR">VARCHAR</option>
                            </select>

                            {attr?.data.dataType === 'VARCHAR' && (
                                <input
                                    type="number"
                                    placeholder="Size (e.g. 255)"
                                    className={`w-full p-1 rounded text-foreground ${(!attr?.data?.size) ? 'border-destructive border bg-destructive/10' : 'border-surface-border border bg-surface'} focus-visible:outline-none`}
                                    value={attr?.data.size as string || ''}
                                    onChange={(e) => updateNodeData(attr?.id, { size: e.target.value })}
                                />
                            )}
                        </div>
                    ))}

                    <h3 className="font-bold text-foreground mt-4">Hidden Attributes</h3>
                    {hiddenAttributes.map((hiddenAttr: any, index: any) => (
                        <div key={index} className="border border-surface-border bg-background p-4 mb-2 relative rounded">
                            <div
                                className="text-destructive hover:text-red-600 font-bold text-2xl cursor-pointer absolute -top-1 right-1"
                                onClick={(e) => {
                                    const newArray = hiddenAttributes.filter(attr => attr.name != hiddenAttr.name);
                                    updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                }}>&times;</div>

                            <input
                                type="text"
                                className="border border-surface-border bg-surface text-foreground p-1 rounded outline-none mb-2 w-full focus:border-brand-blue"
                                value={hiddenAttr.name}
                                onChange={(e) => {
                                    const newArray = [...hiddenAttributes];
                                    newArray[index].name = e.target.value;
                                    updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                }}
                            />

                            <select
                                className={`border p-1 rounded outline-none w-full mb-2 text-foreground ${!hiddenAttr.dataType ? 'border-destructive bg-destructive/10' : 'border-surface-border bg-surface focus:border-brand-blue'}`}
                                value={hiddenAttr.dataType || ''}
                                onChange={(e) => {
                                    const newArray = [...hiddenAttributes];
                                    newArray[index].dataType = e.target.value;
                                    updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                }}
                            >
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="">Select Type...</option>
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="INT">INT</option>
                                <option className='border border-surface-border bg-background text-foreground focus:border-brand-blue' value="VARCHAR">VARCHAR</option>
                            </select>

                            {hiddenAttr.dataType === 'VARCHAR' && (
                                <input
                                    type="number"
                                    className="border border-surface-border bg-surface text-foreground p-1 rounded outline-none w-full focus:border-brand-blue"
                                    placeholder="Size (e.g. 255)"
                                    value={hiddenAttr.size || ''}
                                    onChange={(e) => {
                                        const newArray = [...hiddenAttributes];
                                        newArray[index].size = e.target.value;
                                        updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                                    }}
                                />
                            )}
                        </div>
                    ))}

                    <button className="bg-brand-blue/20 border border-brand-blue/30 text-brand-blue font-semibold px-2 py-2 rounded mt-2 hover:bg-brand-blue/30 transition"
                        onClick={() => {
                            const newArray = [...hiddenAttributes, { name: 'new_column', dataType: '', size: '' }];
                            updateNodeData(activeEntity.id, { hiddenAttributes: newArray });
                        }}
                    >
                        + Add Hidden Attribute
                    </button>

                    <div className="mt-auto flex gap-3 pt-4 border-t border-surface-border">
                        <button
                            className="flex-1 bg-surface border border-surface-border text-foreground px-4 py-2 rounded font-semibold hover:bg-surface-hover transition"
                            onClick={() => setEntityExpanded(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}