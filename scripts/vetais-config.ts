import { Client } from 'pg';

export function getVetaisDbName(): string {
  return process.argv.find(arg => arg.startsWith('vetais_')) || process.env.VETAIS_DB_NAME || 'vetais_alisavet';
}

export function createVetaisClient(dbName?: string): Client {
  const database = dbName || getVetaisDbName();
  console.log(`  Vetais DB: ${database}`);
  return new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5454'),
    database,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });
}

export const VETAIS_DATABASES = {
  alisavet: 'vetais_alisavet',
  haks: 'vetais_haks',
  vasilek: 'vetais_vasilek',         // host: 94.198.53.52, password: vetais
  dingo: 'vetais',                   // host: 109.173.124.18, password: vetais
  probiko: 'vetais_probiko_local',   // localhost:5432, password: ASPI6rin (локальный бэкап)
} as const;

export const TENANT_VETAIS_MAPPING: Record<string, string> = {
  'default-tenant-001': 'vetais_alisavet',
  'e7c3459d-599b-4570-858f-1674dbd8db82': 'vetais_haks',
  '06d235e4-e7ba-4b2c-87a2-77afc72c4358': 'arutyn1',            // Усатый Полосатый
  'bd89523e-47e7-4d4b-8b94-e98c6d3e1959': 'vetais_vasilek',     // Василёк (host: 94.198.53.52)
  'e556ed34-71a7-4003-a2cd-b5cf274bae12': 'vetais',             // Динго (host: 109.173.124.18)
  'cc7d6b45-4a05-425d-890e-a5cb1bd89266': 'vetais_probiko_local', // Probiko (localhost)
  '229948ed-759c-45a5-8eb9-13ea97af495a': 'artis',              // Артис (localhost)
};
