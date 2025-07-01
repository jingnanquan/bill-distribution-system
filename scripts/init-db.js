const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/bill_system.db');
const schemaPath = path.join(__dirname, '../schema.sql');

const schema = fs.readFileSync(schemaPath, 'utf8');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(schema);

console.log('✅ 数据库创建成功：data/bill_system.db');
