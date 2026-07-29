import React from 'react';
import { Handle, Position } from '@xyflow/react';

// An invisible compound parent node to wrap entity + attributes
const InvisibleBoxNode = () => {
    return (
        <div className="w-full h-full pointer-events-none bg-transparent">
            {/* No handles needed as edges connect to the children (Entity/Attribute) */}
        </div>
    );
};

export default InvisibleBoxNode;
