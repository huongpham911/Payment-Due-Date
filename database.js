const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Khởi tạo database
const dbPath = path.join(__dirname, 'payments.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDatabase();
    }
});

// Tạo bảng payments nếu chưa tồn tại
function initDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            amount REAL,
            due_date DATE NOT NULL,
            status TEXT DEFAULT 'pending',
            google_event_id TEXT,
            notified INTEGER DEFAULT 0,
            brand TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Database table initialized successfully.');
            // Chạy migration để thêm các cột mới cho database cũ
            migrateDatabase();
        }
    });

    // Tạo bảng settings
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Error creating settings table:', err.message);
        }
    });
}

// Migration để thêm cột brand và category cho database cũ
function migrateDatabase() {
    // Kiểm tra xem cột brand đã tồn tại chưa
    db.all("PRAGMA table_info(payments)", [], (err, rows) => {
        if (err) {
            console.error('Error checking table structure:', err.message);
            return;
        }

        const hasBrand = rows.some(row => row.name === 'brand');
        const hasCategory = rows.some(row => row.name === 'category');
        const hasLastNotifiedDays = rows.some(row => row.name === 'last_notified_days');
        const hasPurchaseDate = rows.some(row => row.name === 'purchase_date');
        const hasExpiryDatetime = rows.some(row => row.name === 'expiry_datetime');
        const hasNotified2hours = rows.some(row => row.name === 'notified_2hours');

        // Thêm cột brand nếu chưa có
        if (!hasBrand) {
            db.run('ALTER TABLE payments ADD COLUMN brand TEXT', (err) => {
                if (err) {
                    console.error('Error adding brand column:', err.message);
                } else {
                    console.log('✓ Added brand column to payments table');
                }
            });
        }

        // Thêm cột category nếu chưa có
        if (!hasCategory) {
            db.run('ALTER TABLE payments ADD COLUMN category TEXT', (err) => {
                if (err) {
                    console.error('Error adding category column:', err.message);
                } else {
                    console.log('✓ Added category column to payments table');
                }
            });
        }

        // Thêm cột last_notified_days nếu chưa có
        if (!hasLastNotifiedDays) {
            db.run('ALTER TABLE payments ADD COLUMN last_notified_days INTEGER', (err) => {
                if (err) {
                    console.error('Error adding last_notified_days column:', err.message);
                } else {
                    console.log('✓ Added last_notified_days column to payments table');
                }
            });
        }

        // Thêm cột purchase_date nếu chưa có
        if (!hasPurchaseDate) {
            db.run('ALTER TABLE payments ADD COLUMN purchase_date DATE', (err) => {
                if (err) {
                    console.error('Error adding purchase_date column:', err.message);
                } else {
                    console.log('✓ Added purchase_date column to payments table');
                }
            });
        }

        // Thêm cột expiry_datetime nếu chưa có
        if (!hasExpiryDatetime) {
            db.run('ALTER TABLE payments ADD COLUMN expiry_datetime DATETIME', (err) => {
                if (err) {
                    console.error('Error adding expiry_datetime column:', err.message);
                } else {
                    console.log('✓ Added expiry_datetime column to payments table');
                }
            });
        }

        // Thêm cột notified_2hours nếu chưa có
        if (!hasNotified2hours) {
            db.run('ALTER TABLE payments ADD COLUMN notified_2hours INTEGER DEFAULT 0', (err) => {
                if (err) {
                    console.error('Error adding notified_2hours column:', err.message);
                } else {
                    console.log('✓ Added notified_2hours column to payments table');
                }
            });
        }
    });
}

// Các hàm helper cho database operations
const dbOperations = {
    // Thêm payment mới
    addPayment: (payment) => {
        return new Promise((resolve, reject) => {
            const { title, description, amount, due_date, google_event_id, brand, category, purchase_date, expiry_datetime } = payment;
            db.run(
                `INSERT INTO payments (title, description, amount, due_date, google_event_id, brand, category, purchase_date, expiry_datetime)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, amount, due_date, google_event_id, brand, category, purchase_date, expiry_datetime],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...payment });
                }
            );
        });
    },

    // Lấy tất cả payments
    getAllPayments: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM payments ORDER BY due_date ASC', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Lấy payment theo ID
    getPaymentById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM payments WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Cập nhật payment
    updatePayment: (id, updates) => {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            });

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);

            const sql = `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`;

            db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    },

    // Xóa payment
    deletePayment: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM payments WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    },

    // Lấy payments sắp đến hạn (chưa được thông báo)
    getUpcomingPayments: (daysAhead) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM payments
                WHERE status = 'pending'
                AND notified = 0
                AND date(due_date) <= date('now', '+' || ? || ' days')
                AND date(due_date) >= date('now')
                ORDER BY due_date ASC
            `;
            db.all(sql, [daysAhead], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Đánh dấu payment đã được thông báo
    markAsNotified: (id) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE payments SET notified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, changes: this.changes });
                }
            );
        });
    },

    // Lưu/lấy settings
    saveSetting: (key, value) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                [key, value],
                function(err) {
                    if (err) reject(err);
                    else resolve({ key, value });
                }
            );
        });
    },

    getSetting: (key) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.value : null);
            });
        });
    },

    // Lấy tất cả brands duy nhất
    getAllBrands: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT brand, category, COUNT(*) as count
                FROM payments
                WHERE brand IS NOT NULL AND brand != ''
                GROUP BY brand, category
                ORDER BY brand ASC
            `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Lấy tất cả categories duy nhất
    getAllCategories: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT category, COUNT(*) as count
                FROM payments
                WHERE category IS NOT NULL AND category != ''
                GROUP BY category
                ORDER BY category ASC
            `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Lấy payments theo brand
    getPaymentsByBrand: (brand) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM payments WHERE brand = ? ORDER BY due_date ASC`;
            db.all(sql, [brand], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Lấy payments theo category
    getPaymentsByCategory: (category) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM payments WHERE category = ? ORDER BY due_date ASC`;
            db.all(sql, [category], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Lấy thống kê theo brand
    getBrandStatistics: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    brand,
                    category,
                    COUNT(*) as total_payments,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                    SUM(amount) as total_amount
                FROM payments
                WHERE brand IS NOT NULL AND brand != ''
                GROUP BY brand, category
                ORDER BY total_amount DESC
            `;
            db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};

module.exports = { db, dbOperations };
