import React from 'react';

export default function Sidebar() {

    // 1. Update the onDragStart function to accept the new parameter
    const onDragStart = (event: React.DragEvent, nodeType: string, subType?: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);

        // If it's an attribute, it's an attributeType. If it's an entity, it's an entityType.
        if (subType) {
            if (nodeType === 'attribute') event.dataTransfer.setData('application/reactflow/attributeType', subType);
            if (nodeType === 'entity') event.dataTransfer.setData('application/reactflow/entityType', subType);
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    // 🌟 Refactored base class to keep our JSX clean and automatically handle Dark/Light hover states
    const itemBaseClass = "w-full h-12 bg-background flex items-center justify-center cursor-grab hover:bg-surface-hover transition-all text-foreground shadow-sm hover:shadow-md hover:border-brand-blue hover:text-brand-blue";

    return (
        <div className="overflow-y-auto w-64 bg-surface border-r border-surface-border p-4 flex flex-col gap-4 transition-colors duration-300">
            <h2 className="text-lg font-bold border-b border-surface-border pb-2 text-foreground">Symbols</h2>

            {/* Entity Draggables */}
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Entities</h3>

                {/* Standard Entity */}
                <div
                    className={`${itemBaseClass} rounded-md border-2 border-foreground/40 mb-2`}
                    onDragStart={(event) => onDragStart(event, 'entity', 'standard')}
                    draggable
                >
                    Entity
                </div>

                {/* Weak Entity */}
                <div
                    className={`${itemBaseClass} rounded-md border-4 border-double border-foreground/40`}
                    onDragStart={(event) => onDragStart(event, 'entity', 'weak')}
                    draggable
                >
                    Weak Entity
                </div>
            </div>

            {/* Attributes Draggables */}
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 mt-4">Attributes</h3>

                {/* Simple Attribute */}
                <div
                    className={`${itemBaseClass} rounded-full border-2 border-foreground/40 mb-2`}
                    onDragStart={(event) => onDragStart(event, 'attribute', 'simple')}
                    draggable
                >
                    Simple
                </div>

                {/* Key Attribute */}
                <div
                    className={`${itemBaseClass} rounded-full border-2 border-foreground/40 mb-3 underline decoration-solid`}
                    onDragStart={(event) => onDragStart(event, 'attribute', 'key')}
                    draggable
                >
                    Key
                </div>

                {/* Multi-Valued Attribute */}
                <div
                    className={`${itemBaseClass} rounded-full border-2 border-foreground/40 mb-2 outline outline-2 outline-offset-2 outline-foreground/40 hover:outline-brand-blue`}
                    onDragStart={(event) => onDragStart(event, 'attribute', 'multi-valued')}
                    draggable
                >
                    Multi-Valued
                </div>

                {/* Derived Attribute */}
                <div
                    className={`${itemBaseClass} rounded-full border-2 border-foreground/40 mb-2 border-dashed`}
                    onDragStart={(event) => onDragStart(event, 'attribute', 'derived')}
                    draggable
                >
                    Derived
                </div>

                {/* Composite Attribute (FIXED TYPO & ADDED STYLING) */}
                <div
                    className={`${itemBaseClass} rounded-full border-[thin] border-foreground/40 bg-surface-hover shadow-inner mb-2`}
                    onDragStart={(event) => onDragStart(event, 'attribute', 'composite')}
                    draggable
                >
                    Composite
                </div>
            </div>
        </div>
    );
}