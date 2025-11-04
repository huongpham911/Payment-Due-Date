require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { dbOperations } = require('./database');
const googleCalendar = require('./googleCalendar');
const telegramBot = require('./telegramBot');
const notificationScheduler = require('./notificationScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== GOOGLE CALENDAR ROUTES =====

// Route để bắt đầu quá trình authorization với Google
app.get('/auth/google', (req, res) => {
    if (googleCalendar.isAuthorized()) {
        res.json({ success: true, message: 'Already authorized', authorized: true });
    } else {
        const authUrl = googleCalendar.getAuthUrl();
        res.json({ success: true, authUrl: authUrl, authorized: false });
    }
});

// Callback route sau khi user authorize
app.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send('Authorization code not found');
    }

    const success = await googleCalendar.handleAuthCallback(code);

    if (success) {
        res.send(`
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .message {
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                        }
                        .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
                        h1 { color: #333; margin: 0 0 10px 0; }
                        p { color: #666; margin: 10px 0; }
                        button {
                            margin-top: 20px;
                            padding: 12px 24px;
                            background: #667eea;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                        }
                        button:hover { background: #5568d3; }
                    </style>
                </head>
                <body>
                    <div class="message">
                        <div class="success">✓</div>
                        <h1>Google Calendar đã kết nối!</h1>
                        <p>Bạn có thể đóng trang này và quay lại ứng dụng.</p>
                        <button onclick="window.close()">Đóng trang</button>
                    </div>
                </body>
            </html>
        `);
    } else {
        res.status(500).send('Failed to authorize Google Calendar');
    }
});

// Kiểm tra trạng thái Google Calendar
app.get('/api/google/status', (req, res) => {
    res.json({
        authorized: googleCalendar.isAuthorized()
    });
});

// ===== PAYMENT ROUTES =====

// Lấy tất cả payments
app.get('/api/payments', async (req, res) => {
    try {
        const payments = await dbOperations.getAllPayments();
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lấy payment theo ID
app.get('/api/payments/:id', async (req, res) => {
    try {
        const payment = await dbOperations.getPaymentById(req.params.id);
        if (payment) {
            res.json({ success: true, data: payment });
        } else {
            res.status(404).json({ success: false, message: 'Payment not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Tạo payment mới
app.post('/api/payments', async (req, res) => {
    try {
        const { title, description, amount, due_date } = req.body;

        // Validate
        if (!title || !due_date) {
            return res.status(400).json({
                success: false,
                message: 'Title and due_date are required'
            });
        }

        let google_event_id = null;

        // Tạo event trên Google Calendar nếu đã authorize
        if (googleCalendar.isAuthorized()) {
            try {
                google_event_id = await googleCalendar.createEvent({
                    title,
                    description,
                    amount,
                    due_date
                });
            } catch (error) {
                console.error('Failed to create Google Calendar event:', error.message);
            }
        }

        // Lưu vào database
        const payment = await dbOperations.addPayment({
            title,
            description,
            amount,
            due_date,
            google_event_id
        });

        // Gửi thông báo qua Telegram
        await telegramBot.sendPaymentCreatedNotification(payment);

        res.json({
            success: true,
            data: payment,
            message: 'Payment created successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Cập nhật payment
app.put('/api/payments/:id', async (req, res) => {
    try {
        const { title, description, amount, due_date, status } = req.body;
        const id = req.params.id;

        // Lấy payment hiện tại
        const currentPayment = await dbOperations.getPaymentById(id);
        if (!currentPayment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Chuẩn bị updates
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (amount !== undefined) updates.amount = amount;
        if (due_date !== undefined) updates.due_date = due_date;
        if (status !== undefined) updates.status = status;

        // Reset notified flag nếu due_date thay đổi
        if (due_date && due_date !== currentPayment.due_date) {
            updates.notified = 0;
        }

        // Cập nhật database
        await dbOperations.updatePayment(id, updates);

        // Lấy payment đã cập nhật
        const updatedPayment = await dbOperations.getPaymentById(id);

        // Cập nhật Google Calendar event nếu có
        if (currentPayment.google_event_id && googleCalendar.isAuthorized()) {
            try {
                await googleCalendar.updateEvent(currentPayment.google_event_id, updatedPayment);
            } catch (error) {
                console.error('Failed to update Google Calendar event:', error.message);
            }
        }

        // Gửi thông báo qua Telegram
        await telegramBot.sendPaymentUpdatedNotification(updatedPayment);

        res.json({
            success: true,
            data: updatedPayment,
            message: 'Payment updated successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa payment
app.delete('/api/payments/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Lấy payment để có thông tin trước khi xóa
        const payment = await dbOperations.getPaymentById(id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Xóa Google Calendar event nếu có
        if (payment.google_event_id && googleCalendar.isAuthorized()) {
            try {
                await googleCalendar.deleteEvent(payment.google_event_id);
            } catch (error) {
                console.error('Failed to delete Google Calendar event:', error.message);
            }
        }

        // Xóa khỏi database
        await dbOperations.deletePayment(id);

        // Gửi thông báo qua Telegram
        await telegramBot.sendPaymentDeletedNotification(payment);

        res.json({
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Lấy payments sắp đến hạn
app.get('/api/payments/upcoming/:days', async (req, res) => {
    try {
        const days = parseInt(req.params.days) || 7;
        const payments = await dbOperations.getUpcomingPayments(days);
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== NOTIFICATION ROUTES =====

// Kiểm tra trạng thái notification scheduler
app.get('/api/notifications/status', (req, res) => {
    const status = notificationScheduler.getStatus();
    res.json({ success: true, data: status });
});

// Chạy notification check thủ công
app.post('/api/notifications/check', async (req, res) => {
    try {
        const result = await notificationScheduler.runManualCheck();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Gửi báo cáo tổng hợp
app.post('/api/notifications/summary', async (req, res) => {
    try {
        const result = await notificationScheduler.sendSummaryReport();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== TELEGRAM ROUTES =====

// Test Telegram connection
app.get('/api/telegram/test', async (req, res) => {
    try {
        const result = await telegramBot.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Kiểm tra trạng thái Telegram
app.get('/api/telegram/status', (req, res) => {
    res.json({
        success: true,
        enabled: telegramBot.isEnabled()
    });
});

// ===== SYSTEM ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: true,
            googleCalendar: googleCalendar.isAuthorized(),
            telegram: telegramBot.isEnabled(),
            scheduler: notificationScheduler.getStatus().isRunning
        }
    });
});

// Serve index.html cho route chính
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   💰 Payment Due Date Alert System                            ║
║                                                               ║
║   Server đang chạy tại: http://localhost:${PORT}                ║
║                                                               ║
║   📅 Google Calendar: ${googleCalendar.isAuthorized() ? '✓ Connected' : '✗ Not connected'}                     ║
║   📱 Telegram Bot: ${telegramBot.isEnabled() ? '✓ Enabled' : '✗ Disabled'}                        ║
║   🔔 Scheduler: ${notificationScheduler.getStatus().isRunning ? '✓ Running' : '✗ Stopped'}                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // Khởi động notification scheduler
    notificationScheduler.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    notificationScheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    notificationScheduler.stop();
    process.exit(0);
});
