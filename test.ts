import { generateSQL } from './lib/sqlGenerator';
import { generatePrisma } from './lib/prismaGenerator';

const compiledEntities: any = [
  {
    id: 'PATIENTS',
    type: 'entity',
    position: { x: 0, y: 0 },
    data: { label: 'PATIENTS', primaryKey: 'patient_id' },
    attributes: [
      { id: 'patient_id', type: 'attribute', name: 'patient_id', dataType: 'INT', isPrimaryKey: true },
    ],
    foreignKeys: []
  },
  {
    id: 'MEDICATIONS',
    type: 'entity',
    position: { x: 0, y: 0 },
    data: { label: 'MEDICATIONS', primaryKey: 'medication_code' },
    attributes: [
      { id: 'medication_code', type: 'attribute', name: 'medication_code', dataType: 'INT', isPrimaryKey: true },
    ],
    foreignKeys: []
  }
];

const edges: any = [
  {
    id: 'rel_1',
    source: 'PATIENTS',
    target: 'MEDICATIONS',
    type: 'relationship',
    data: {
      label: 'PRESCRIBES',
      sourceMaximumCardinality: 'M',
      targetMaximumCardinality: 'N',
    }
  }
];

const relationshipAttributes: any = [
  {
    sourceEntity: 'PATIENTS',
    targetEntity: 'MEDICATIONS',
    attributes: [
      { name: 'daily_dosage_mg', dataType: 'INT' },
      { name: 'refill_limit', dataType: 'INT' }
    ]
  }
];

console.log("=== SQL ===");
console.log(generateSQL(compiledEntities, edges, "mysql", relationshipAttributes));

console.log("=== PRISMA ===");
console.log(generatePrisma(compiledEntities, edges, relationshipAttributes));
