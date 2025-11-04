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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Database table initialized successfully.');
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

// Các hàm helper cho database operations
const dbOperations = {
    // Thêm payment mới
    addPayment: (payment) => {
        return new Promise((resolve, reject) => {
            const { title, description, amount, due_date, google_event_id } = payment;
            db.run(
                `INSERT INTO payments (title, description, amount, due_date, google_event_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [title, description, amount, due_date, google_event_id],
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
    }
};

module.exports = { db, dbOperations };
