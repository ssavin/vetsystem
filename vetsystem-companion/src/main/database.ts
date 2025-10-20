import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { Client, Patient, NomenclatureItem, Appointment, Invoice, SyncQueueItem } from '@shared/types';

export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'vetsystem.db');
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    // Clients table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Patients table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        species TEXT NOT NULL,
        breed TEXT,
        birth_date TEXT,
        gender TEXT,
        client_id INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `);

    // Nomenclature table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nomenclature (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Appointments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        doctor_name TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Invoices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        patient_id INTEGER,
        items TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_status TEXT DEFAULT 'pending',
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Sync queue table (CRITICAL!)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  }

  // Clients
  getAllClients(): Client[] {
    return this.db.prepare('SELECT * FROM clients ORDER BY full_name').all() as Client[];
  }

  searchClients(query: string): Client[] {
    return this.db.prepare(
      'SELECT * FROM clients WHERE full_name LIKE ? OR phone LIKE ? ORDER BY full_name'
    ).all(`%${query}%`, `%${query}%`) as Client[];
  }

  createClient(client: Client): number {
    const result = this.db.prepare(
      'INSERT INTO clients (full_name, phone, email, address) VALUES (?, ?, ?, ?)'
    ).run(client.full_name, client.phone, client.email || null, client.address || null);
    
    return result.lastInsertRowid as number;
  }

  // Patients
  getPatientsByClient(clientId: number): Patient[] {
    return this.db.prepare('SELECT * FROM patients WHERE client_id = ?').all(clientId) as Patient[];
  }

  createPatient(patient: Patient): number {
    const result = this.db.prepare(
      'INSERT INTO patients (name, species, breed, birth_date, gender, client_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(patient.name, patient.species, patient.breed || null, patient.birth_date || null, patient.gender || null, patient.client_id);
    
    return result.lastInsertRowid as number;
  }

  // Nomenclature
  getAllNomenclature(): NomenclatureItem[] {
    return this.db.prepare('SELECT * FROM nomenclature ORDER BY name').all() as NomenclatureItem[];
  }

  searchNomenclature(query: string): NomenclatureItem[] {
    return this.db.prepare(
      'SELECT * FROM nomenclature WHERE name LIKE ? ORDER BY name'
    ).all(`%${query}%`) as NomenclatureItem[];
  }

  replaceAllNomenclature(items: NomenclatureItem[]) {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM nomenclature').run();
      const insert = this.db.prepare(
        'INSERT INTO nomenclature (id, name, type, price, category) VALUES (?, ?, ?, ?, ?)'
      );
      for (const item of items) {
        insert.run(item.id, item.name, item.type, item.price, item.category || null);
      }
    });
    transaction();
  }

  // Appointments
  createAppointment(appointment: Appointment): number {
    const result = this.db.prepare(
      'INSERT INTO appointments (client_id, patient_id, appointment_date, appointment_time, doctor_name, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      appointment.client_id,
      appointment.patient_id,
      appointment.appointment_date,
      appointment.appointment_time,
      appointment.doctor_name || null,
      appointment.notes || null
    );
    
    return result.lastInsertRowid as number;
  }

  getRecentAppointments(limit: number = 50): Appointment[] {
    return this.db.prepare(
      'SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC LIMIT ?'
    ).all(limit) as Appointment[];
  }

  // Invoices
  createInvoice(invoice: Invoice): number {
    const result = this.db.prepare(
      'INSERT INTO invoices (client_id, patient_id, items, total_amount, payment_status) VALUES (?, ?, ?, ?, ?)'
    ).run(
      invoice.client_id,
      invoice.patient_id || null,
      JSON.stringify(invoice.items),
      invoice.total_amount,
      invoice.payment_status
    );
    
    return result.lastInsertRowid as number;
  }

  getRecentInvoices(limit: number = 50): Invoice[] {
    const invoices = this.db.prepare(
      'SELECT * FROM invoices ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as any[];
    
    return invoices.map(inv => ({
      ...inv,
      items: JSON.parse(inv.items)
    }));
  }

  // Sync Queue
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at'>): number {
    const result = this.db.prepare(
      'INSERT INTO sync_queue (action_type, payload, status) VALUES (?, ?, ?)'
    ).run(item.action_type, JSON.stringify(item.payload), item.status);
    
    return result.lastInsertRowid as number;
  }

  getPendingSyncItems(): SyncQueueItem[] {
    const items = this.db.prepare(
      'SELECT * FROM sync_queue WHERE status = ? ORDER BY created_at ASC LIMIT 50'
    ).all('pending') as any[];
    
    return items.map(item => ({
      ...item,
      payload: JSON.parse(item.payload)
    }));
  }

  updateSyncItemStatus(id: number, status: 'success' | 'error', errorMessage?: string) {
    this.db.prepare(
      'UPDATE sync_queue SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, errorMessage || null, id);
  }

  getPendingSyncCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE status = ?').get('pending') as any;
    return result.count;
  }

  close() {
    this.db.close();
  }
}
