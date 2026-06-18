const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/rentacar.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database:', dbPath);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

/**
 * Initialize database schema
 */
function initSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          image_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Locations table
      db.run(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(200) NOT NULL,
          address TEXT NOT NULL,
          city VARCHAR(100) NOT NULL,
          phone VARCHAR(30),
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Vehicles table
      db.run(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          name VARCHAR(200) NOT NULL,
          slug VARCHAR(200) NOT NULL UNIQUE,
          description TEXT,
          daily_price DECIMAL(10,2) NOT NULL,
          fuel_type VARCHAR(50) NOT NULL,
          transmission VARCHAR(50) NOT NULL,
          seat_count INTEGER NOT NULL,
          year INTEGER,
          status VARCHAR(50) NOT NULL DEFAULT 'available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);

      // Media table
      db.run(`
        CREATE TABLE IF NOT EXISTS media (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vehicle_id INTEGER NOT NULL,
          filename VARCHAR(500) NOT NULL,
          original_name VARCHAR(500),
          mime_type VARCHAR(100) NOT NULL,
          size_bytes INTEGER,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        )
      `);

      // Customers table
      db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(200) NOT NULL,
          phone VARCHAR(30) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Reservations table
      db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference_number VARCHAR(50) NOT NULL UNIQUE,
          vehicle_id INTEGER NOT NULL,
          customer_id INTEGER NOT NULL,
          pickup_location_id INTEGER NOT NULL,
          return_location_id INTEGER,
          pickup_date DATE NOT NULL,
          return_date DATE NOT NULL,
          total_price DECIMAL(10,2),
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (pickup_location_id) REFERENCES locations(id),
          FOREIGN KEY (return_location_id) REFERENCES locations(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error initializing schema:', err);
          reject(err);
        } else {
          console.log('Database schema initialized');
          resolve();
        }
      });
    });
  });
}

/**
 * Run a query and return Promise
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Get all rows
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get single row
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Close database connection
 */
function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  initSchema,
  run,
  all,
  get,
  close,
};
