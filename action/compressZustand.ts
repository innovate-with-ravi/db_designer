"use server"
import { Node, Edge } from '@xyflow/react';
import React from 'react';

interface Entity {
    id: '1', 
    type: 'entity',
    attributes:[
        {visible:'true'}, {visible:'true'},{visible:'true'},{visible:'true'}
    ]
    position: { x: 250, y: 300 }, 
    data: { label: 'STUDENT'
}

export const compress = (nodes:Node[], edges: Edge[]): Entity[] {
    let compressedEntities:Entity[] = [];



    return compressedEntities;
}