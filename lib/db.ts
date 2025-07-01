import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'bill_system.db');
const db = new Database(dbPath);

export default db;
