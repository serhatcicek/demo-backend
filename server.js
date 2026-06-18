require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const db = require('./src/database');
const { seed } = require('./src/seeds');

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files as static
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'Anar Rent A Car API is running' });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API: VEHICLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/vehicles
 * List all vehicles with optional filters
 */
app.get('/api/v1/vehicles', async (req, res) => {
  try {
    const { category_slug, status = 'available', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        v.id, v.name, v.slug, v.description, v.daily_price,
        v.fuel_type, v.transmission, v.seat_count, v.year, v.status,
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        m.id as media_id, m.filename as media_filename
      FROM vehicles v
      JOIN categories c ON v.category_id = c.id
      LEFT JOIN (
        SELECT id, vehicle_id, filename, display_order
        FROM media
        WHERE display_order = 0
        ORDER BY display_order, created_at
      ) m ON v.id = m.vehicle_id
      WHERE v.status = ?
    `;
    const params = [status];

    if (category_slug) {
      sql += ' AND c.slug = ?';
      params.push(category_slug);
    }

    sql += ` ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const vehicles = await db.all(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM vehicles v JOIN categories c ON v.category_id = c.id WHERE v.status = ?';
    const countParams = [status];
    if (category_slug) {
      countSql += ' AND c.slug = ?';
      countParams.push(category_slug);
    }
    const countResult = await db.get(countSql, countParams);

    res.json({
      data: vehicles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

/**
 * GET /api/v1/vehicles/:slug
 * Get vehicle detail by slug
 */
app.get('/api/v1/vehicles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const vehicle = await db.get(
      `
      SELECT 
        v.id, v.name, v.slug, v.description, v.daily_price,
        v.fuel_type, v.transmission, v.seat_count, v.year, v.status,
        c.id as category_id, c.name as category_name, c.slug as category_slug
      FROM vehicles v
      JOIN categories c ON v.category_id = c.id
      WHERE v.slug = ?
      `,
      [slug]
    );

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Get all media for this vehicle
    const media = await db.all(
      'SELECT id, filename, mime_type, display_order FROM media WHERE vehicle_id = ? ORDER BY display_order',
      [vehicle.id]
    );

    res.json({
      ...vehicle,
      media,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API: CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/categories
 * List all categories
 */
app.get('/api/v1/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT id, name, slug, image_url FROM categories ORDER BY name');
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API: LOCATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/locations
 * List all active locations
 */
app.get('/api/v1/locations', async (req, res) => {
  try {
    const locations = await db.all(
      `SELECT id, name, city, address, phone, latitude, longitude 
       FROM locations WHERE is_active = 1 ORDER BY name`
    );
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API: RESERVATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/reservations
 * Create a new reservation/inquiry
 */
app.post('/api/v1/reservations', async (req, res) => {
  try {
    const {
      vehicle_id,
      first_name,
      last_name,
      email,
      phone,
      pickup_location_id,
      return_location_id,
      pickup_date,
      return_date,
      notes,
    } = req.body;

    // Validation
    if (!vehicle_id || !first_name || !last_name || !email || !phone || !pickup_location_id || !pickup_date || !return_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate reference number
    const refNumber = `RAC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // Create customer
    const customerResult = await db.run(
      'INSERT INTO customers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)',
      [first_name, last_name, email, phone]
    );

    // Calculate total price
    const vehicle = await db.get('SELECT daily_price FROM vehicles WHERE id = ?', [vehicle_id]);
    const pickupDate = new Date(pickup_date);
    const returnDateObj = new Date(return_date);
    const days = Math.ceil((returnDateObj - pickupDate) / (1000 * 60 * 60 * 24));
    const totalPrice = vehicle.daily_price * Math.max(1, days);

    // Create reservation
    const result = await db.run(
      `INSERT INTO reservations 
       (reference_number, vehicle_id, customer_id, pickup_location_id, return_location_id, pickup_date, return_date, total_price, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        refNumber,
        vehicle_id,
        customerResult.id,
        pickup_location_id,
        return_location_id || pickup_location_id,
        pickup_date,
        return_date,
        totalPrice,
        notes || null,
      ]
    );

    res.status(201).json({
      id: result.id,
      reference_number: refNumber,
      message: 'Reservation created successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * GET /api/v1/reservations/:ref
 * Get reservation by reference number
 */
app.get('/api/v1/reservations/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const reservation = await db.get(
      `
      SELECT 
        r.id, r.reference_number, r.vehicle_id, r.customer_id, 
        r.pickup_location_id, r.return_location_id, r.pickup_date, r.return_date,
        r.total_price, r.status, r.notes, r.created_at,
        v.name as vehicle_name, v.slug as vehicle_slug,
        c.first_name, c.last_name, c.email, c.phone,
        pl.name as pickup_location_name,
        rl.name as return_location_name
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.id
      JOIN customers c ON r.customer_id = c.id
      JOIN locations pl ON r.pickup_location_id = pl.id
      LEFT JOIN locations rl ON r.return_location_id = rl.id
      WHERE r.reference_number = ?
      `,
      [ref]
    );

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: AUTH
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');
const adminSessions = new Map(); // Simple in-memory session store for demo

/**
 * POST /api/v1/admin/login
 * Admin login
 */
app.post('/api/v1/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await db.get('SELECT id, username, password_hash FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const sessionId = uuidv4();
    adminSessions.set(sessionId, { admin_id: admin.id, username: admin.username, created_at: Date.now() });

    res.json({
      session_id: sessionId,
      message: 'Login successful',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Middleware: Check admin session
 */
function requireAdmin(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.query.session_id;

  if (!sessionId || !adminSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.admin = adminSessions.get(sessionId);
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: VEHICLES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/vehicles
 * List all vehicles (admin)
 */
app.get('/api/v1/admin/vehicles', requireAdmin, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        v.id, v.name, v.slug, v.description, v.daily_price,
        v.fuel_type, v.transmission, v.seat_count, v.year, v.status,
        c.id as category_id, c.name as category_name,
        COUNT(m.id) as media_count
      FROM vehicles v
      JOIN categories c ON v.category_id = c.id
      LEFT JOIN media m ON v.id = m.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND v.name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (status) {
      sql += ` AND v.status = ?`;
      params.push(status);
    }

    sql += ` GROUP BY v.id ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const vehicles = await db.all(sql, params);
    res.json({ data: vehicles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

/**
 * POST /api/v1/admin/vehicles
 * Create a new vehicle
 */
app.post('/api/v1/admin/vehicles', requireAdmin, async (req, res) => {
  try {
    const { name, category_id, description, daily_price, fuel_type, transmission, seat_count, year } = req.body;

    if (!name || !category_id || !daily_price || !fuel_type || !transmission || !seat_count) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const result = await db.run(
      `INSERT INTO vehicles (category_id, name, slug, description, daily_price, fuel_type, transmission, seat_count, year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, name, slug, description || null, daily_price, fuel_type, transmission, seat_count, year || null]
    );

    res.status(201).json({
      id: result.id,
      message: 'Vehicle created successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

/**
 * PUT /api/v1/admin/vehicles/:id
 * Update a vehicle
 */
app.put('/api/v1/admin/vehicles/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, description, daily_price, fuel_type, transmission, seat_count, year, status } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(category_id);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (daily_price !== undefined) {
      updates.push('daily_price = ?');
      params.push(daily_price);
    }
    if (fuel_type !== undefined) {
      updates.push('fuel_type = ?');
      params.push(fuel_type);
    }
    if (transmission !== undefined) {
      updates.push('transmission = ?');
      params.push(transmission);
    }
    if (seat_count !== undefined) {
      updates.push('seat_count = ?');
      params.push(seat_count);
    }
    if (year !== undefined) {
      updates.push('year = ?');
      params.push(year);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await db.run(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Vehicle updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

/**
 * DELETE /api/v1/admin/vehicles/:id
 * Soft delete a vehicle
 */
app.delete('/api/v1/admin/vehicles/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('UPDATE vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['inactive', id]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: MEDIA UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

const multer = require('multer');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, 'vehicles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || 10485760) },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * POST /api/v1/admin/vehicles/:id/media
 * Upload media for a vehicle
 */
app.post('/api/v1/admin/vehicles/:id/media', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { display_order = 0 } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check vehicle exists
    const vehicle = await db.get('SELECT id FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Insert media record
    const result = await db.run(
      `INSERT INTO media (vehicle_id, filename, original_name, mime_type, size_bytes, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, display_order]
    );

    res.status(201).json({
      id: result.id,
      url: `/uploads/vehicles/${req.file.filename}`,
      message: 'File uploaded successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * DELETE /api/v1/admin/vehicles/:vehicle_id/media/:media_id
 * Delete media file
 */
app.delete('/api/v1/admin/vehicles/:vehicle_id/media/:media_id', requireAdmin, async (req, res) => {
  try {
    const { vehicle_id, media_id } = req.params;

    const media = await db.get('SELECT filename FROM media WHERE id = ? AND vehicle_id = ?', [media_id, vehicle_id]);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete file
    const filePath = path.join(uploadsDir, 'vehicles', media.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record
    await db.run('DELETE FROM media WHERE id = ?', [media_id]);

    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: RESERVATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/reservations
 * List all reservations
 */
app.get('/api/v1/admin/reservations', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        r.id, r.reference_number, r.vehicle_id, r.customer_id,
        r.pickup_date, r.return_date, r.total_price, r.status, r.created_at,
        v.name as vehicle_name,
        c.first_name, c.last_name, c.email, c.phone
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.id
      JOIN customers c ON r.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND r.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const reservations = await db.all(sql, params);
    res.json({ data: reservations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

/**
 * PUT /api/v1/admin/reservations/:id
 * Update reservation status
 */
app.put('/api/v1/admin/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    await db.run('UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

    res.json({ message: 'Reservation updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Initialize database
    await db.initSchema();

    // Seed initial data
    await seed();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Anar Rent A Car API running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
