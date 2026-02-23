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
} as const;

export const TENANT_VETAIS_MAPPING: Record<string, string> = {
  'default-tenant-001': 'vetais_alisavet',
  'e7c3459d-599b-4570-858f-1674dbd8db82': 'vetais_haks',
};
