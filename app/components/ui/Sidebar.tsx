import React from 'react';

export default function Sidebar() {

    // This function attaches the data to the mouse pointer
    const onDragStart = (event: React.DragEvent, nodeType: string, attributeType?: string) => {

        event.dataTransfer.setData('application/reactflow/type', nodeType);

        if (attributeType) {
            event.dataTransfer.setData('application/reactflow/attributeType', attributeType);// why & how this works
        }
        event.dataTransfer.effectAllowed = 'move';// why & how this works
    };

    return (
        <div className="w-64 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-4">
            <h2 className="text-lg font-bold border-b pb-2">Symbols</h2>

            {/* Entity Draggable */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Entities</h3>
                <div
                    className="w-full h-12 border-2 border-black bg-white rounded-md flex items-center justify-center cursor-grab hover:bg-gray-50"
                    onDragStart={(event) => onDragStart(event, 'entity')}
                    draggable
                >
                    Entity
                </div>
            </div>

            {/* Attributes Draggables */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2 mt-4">Attributes</h3>

                {/* Simple Attribute */}
                <div
                    className="w-full h-12 rounded-[50%] border-2 border-black bg-white flex items-center justify-center cursor-grab mb-2 hover:bg-gray-50"
                    onDragStart={(event) => onDragStart(event, 'attribute', 'simple')}
                    draggable
                >
                    Simple
                </div>

                {/* Key Attribute */}
                <div
                    className="w-full h-12 rounded-[50%] border-2 border-black bg-white flex items-center justify-center cursor-grab mb-2 hover:bg-gray-50 underline decoration-solid"
                    onDragStart={(event) => onDragStart(event, 'attribute', 'key')}
                    draggable
                >
                    Key
                </div>
            </div>
        </div>
    );
}