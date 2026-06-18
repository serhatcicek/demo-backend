const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

/**
 * Seed categories
 */
async function seedCategories() {
  const categories = [
    { name: 'Economy', slug: 'economy' },
    { name: 'Sedan', slug: 'sedan' },
    { name: 'Hatchback', slug: 'hatchback' },
    { name: 'SUV', slug: 'suv' },
    { name: 'Van', slug: 'van' },
    { name: 'Luxury', slug: 'luxury' },
  ];

  for (const cat of categories) {
    try {
      await db.run(
        `INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`,
        [cat.name, cat.slug]
      );
    } catch (err) {
      console.error('Error seeding category:', cat, err);
    }
  }
  console.log('✓ Categories seeded');
}

/**
 * Seed locations (with Anar Rent A Car details)
 */
async function seedLocations() {
  const locations = [
    {
      name: 'Mardin Merkez (Anar HQ)',
      city: 'Mardin',
      address: 'ARTUKLU APARTMANI, 13 Mart, MEHMET REMZİ YERSEL CADDESİ NO:5 D:6, 47100 Artuklu/Mardin',
      phone: '0544 289 60 55',
      latitude: 37.3077,
      longitude: 40.7350,
    },
    {
      name: 'İstanbul Havalimanı Şubesi',
      city: 'İstanbul',
      address: 'İstanbul Havalimanı, Terminal A, Zemin Kat',
      phone: null,
      latitude: 41.2612,
      longitude: 28.0433,
    },
    {
      name: 'Ankara Merkez',
      city: 'Ankara',
      address: 'Kızılay Meydanı No:1, Çankaya',
      phone: null,
      latitude: 39.9334,
      longitude: 32.8597,
    },
  ];

  for (const loc of locations) {
    try {
      await db.run(
        `INSERT OR IGNORE INTO locations (name, city, address, phone, latitude, longitude, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [loc.name, loc.city, loc.address, loc.phone, loc.latitude, loc.longitude]
      );
    } catch (err) {
      console.error('Error seeding location:', loc, err);
    }
  }
  console.log('✓ Locations seeded');
}

/**
 * Seed vehicles
 */
async function seedVehicles() {
  // Get category IDs
  const economy = await db.get('SELECT id FROM categories WHERE slug = ?', ['economy']);
  const sedan = await db.get('SELECT id FROM categories WHERE slug = ?', ['sedan']);
  const hatchback = await db.get('SELECT id FROM categories WHERE slug = ?', ['hatchback']);
  const suv = await db.get('SELECT id FROM categories WHERE slug = ?', ['suv']);
  const van = await db.get('SELECT id FROM categories WHERE slug = ?', ['van']);
  const luxury = await db.get('SELECT id FROM categories WHERE slug = ?', ['luxury']);

  const vehicles = [
    {
      category_id: economy.id,
      name: 'Renault Clio 2024',
      slug: 'renault-clio-2024',
      description: 'Kompakt ve ekonomik araç. Şehir içi sürüşleri için ideal.',
      daily_price: 850.00,
      fuel_type: 'petrol',
      transmission: 'manual',
      seat_count: 5,
      year: 2024,
    },
    {
      category_id: economy.id,
      name: 'Opel Corsa 2024',
      slug: 'opel-corsa-2024',
      description: 'Modern ekonomi sınıfı araç, düşük yakıt tüketimi.',
      daily_price: 900.00,
      fuel_type: 'petrol',
      transmission: 'automatic',
      seat_count: 5,
      year: 2024,
    },
    {
      category_id: sedan.id,
      name: 'Toyota Corolla 2024',
      slug: 'toyota-corolla-2024',
      description: 'Güvenilir sedan, rahat iç mekan, modern teknoloji.',
      daily_price: 1200.00,
      fuel_type: 'hybrid',
      transmission: 'automatic',
      seat_count: 5,
      year: 2024,
    },
    {
      category_id: sedan.id,
      name: 'Renault Taliant 2023',
      slug: 'renault-taliant-2023',
      description: 'Konforlu sedan, şık tasarım.',
      daily_price: 1150.00,
      fuel_type: 'petrol',
      transmission: 'automatic',
      seat_count: 5,
      year: 2023,
    },
    {
      category_id: sedan.id,
      name: 'Fiat Egea 2023',
      slug: 'fiat-egea-2023',
      description: 'Kompakt sedan, uygun fiyat.',
      daily_price: 1000.00,
      fuel_type: 'petrol',
      transmission: 'manual',
      seat_count: 5,
      year: 2023,
    },
    {
      category_id: hatchback.id,
      name: 'Hyundai I20 2024',
      slug: 'hyundai-i20-2024',
      description: 'Stilish hatchback, ekonomik seçenek.',
      daily_price: 950.00,
      fuel_type: 'petrol',
      transmission: 'automatic',
      seat_count: 5,
      year: 2024,
    },
    {
      category_id: suv.id,
      name: 'Ford Kuga 2023',
      slug: 'ford-kuga-2023',
      description: 'Hafif SUV, konforlu ve güvenli.',
      daily_price: 1800.00,
      fuel_type: 'diesel',
      transmission: 'automatic',
      seat_count: 5,
      year: 2023,
    },
    {
      category_id: van.id,
      name: 'Volkswagen Caravelle 2022',
      slug: 'volkswagen-caravelle-2022',
      description: 'Geniş van, grup seyahatları için ideal.',
      daily_price: 2500.00,
      fuel_type: 'diesel',
      transmission: 'automatic',
      seat_count: 9,
      year: 2022,
    },
    {
      category_id: luxury.id,
      name: 'Mercedes C180 2024',
      slug: 'mercedes-c180-2024',
      description: 'Lüks sedan, prestijli seyahatlar için.',
      daily_price: 3200.00,
      fuel_type: 'petrol',
      transmission: 'automatic',
      seat_count: 5,
      year: 2024,
    },
    {
      category_id: luxury.id,
      name: 'BMW X5 2023',
      slug: 'bmw-x5-2023',
      description: 'Premium SUV, maksimum konfor.',
      daily_price: 4500.00,
      fuel_type: 'diesel',
      transmission: 'automatic',
      seat_count: 5,
      year: 2023,
    },
  ];

  for (const vehicle of vehicles) {
    try {
      await db.run(
        `INSERT OR IGNORE INTO vehicles 
         (category_id, name, slug, description, daily_price, fuel_type, transmission, seat_count, year, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [
          vehicle.category_id,
          vehicle.name,
          vehicle.slug,
          vehicle.description,
          vehicle.daily_price,
          vehicle.fuel_type,
          vehicle.transmission,
          vehicle.seat_count,
          vehicle.year,
        ]
      );
    } catch (err) {
      console.error('Error seeding vehicle:', vehicle, err);
    }
  }
  console.log('✓ Vehicles seeded');
}

/**
 * Seed admin user
 */
async function seedAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  // Create admins table if not exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    const existing = await db.get('SELECT id FROM admins WHERE username = ?', [adminUsername]);
    
    if (!existing) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await db.run(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        [adminUsername, hash]
      );
      console.log(`✓ Admin user '${adminUsername}' created (password: ${adminPassword})`);
    } else {
      console.log(`✓ Admin user '${adminUsername}' already exists`);
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
}

/**
 * Run all seeds
 */
async function seed() {
  try {
    console.log('🌱 Starting database seeding...');
    await seedCategories();
    await seedLocations();
    await seedVehicles();
    await seedAdmin();
    console.log('✅ Database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

module.exports = { seed };

// Run if called directly
if (require.main === module) {
  seed();
}
