/**
 * Database Connection & Query Wrapper using Node.js DatabaseSync
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'school_erp.db');
const db = new DatabaseSync(DB_PATH);

// Enable Foreign Keys and WAL journal mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

const dbWrapper = {
  db,

  /**
   * Run a query that returns multiple rows
   */
  query(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  /**
   * Run a query that returns a single row
   */
  get(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  },

  /**
   * Run an INSERT, UPDATE, or DELETE query
   * Returns { changes, lastInsertRowid }
   */
  run(sql, params = []) {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },

  /**
   * Execute raw SQL string (can contain multiple statements)
   */
  exec(sql) {
    return db.exec(sql);
  }
};

module.exports = dbWrapper;
