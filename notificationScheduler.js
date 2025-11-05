const cron = require('node-cron');
const { dbOperations } = require('./database');
const telegramBot = require('./telegramBot');

class NotificationScheduler {
    constructor() {
        this.task = null;
        this.isRunning = false;
    }

    // Khởi động scheduler
    start() {
        if (this.isRunning) {
            console.log('Notification scheduler is already running.');
            return;
        }

        // Lấy cron expression từ env hoặc dùng mặc định (9:00 AM mỗi ngày)
        const cronExpression = process.env.NOTIFICATION_CHECK_INTERVAL || '0 9 * * *';

        console.log(`Starting notification scheduler with cron: ${cronExpression}`);

        // Schedule task
        this.task = cron.schedule(cronExpression, async () => {
            console.log('Running scheduled notification check...');
            await this.checkAndNotify();
        });

        // Chạy một lần ngay khi khởi động để test
        this.checkAndNotify();

        this.isRunning = true;
        console.log('Notification scheduler started successfully.');
    }

    // Dừng scheduler
    stop() {
        if (this.task) {
            this.task.stop();
            this.isRunning = false;
            console.log('Notification scheduler stopped.');
        }
    }

    // Kiểm tra và gửi thông báo
    async checkAndNotify() {
        try {
            // Lấy reminder days từ settings (mặc định: 7, 3, 1, 0 ngày trước)
            const settingsData = await dbOperations.getSetting('reminder_days');
            const reminderDays = settingsData ? JSON.parse(settingsData) : [7, 3, 1, 0];

            console.log(`Checking for payments with reminder days: ${reminderDays.join(', ')}`);

            // Lấy tất cả payments pending
            const allPayments = await dbOperations.getAllPayments();
            const pendingPayments = allPayments.filter(p => p.status === 'pending');

            let notificationCount = 0;

            // Kiểm tra từng payment
            for (const payment of pendingPayments) {
                const daysUntilDue = this.calculateDaysUntilDue(payment.due_date);

                // Kiểm tra xem có cần nhắc nhở không
                if (reminderDays.includes(daysUntilDue)) {
                    // Kiểm tra xem đã nhắc nhở cho mốc này chưa
                    const lastNotified = payment.last_notified_days || -1;

                    if (lastNotified !== daysUntilDue) {
                        console.log(`Sending notification for: ${payment.title} (Due in ${daysUntilDue} days)`);

                        // Gửi thông báo qua Telegram
                        const sent = await telegramBot.sendPaymentAlert(payment, daysUntilDue);

                        if (sent) {
                            // Cập nhật last_notified_days
                            await dbOperations.updatePayment(payment.id, {
                                last_notified_days: daysUntilDue
                            });
                            console.log(`✓ Notification sent for payment ID: ${payment.id}`);
                            notificationCount++;
                        }

                        await this.delay(1000);
                    }
                }
            }

            console.log(`Notification check completed. Sent ${notificationCount} notification(s).`);
        } catch (error) {
            console.error('Error in notification scheduler:', error.message);
        }
    }

    // Tính số ngày đến hạn
    calculateDaysUntilDue(dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    // Helper function để delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Chạy kiểm tra thủ công (có thể gọi từ API)
    async runManualCheck() {
        console.log('Running manual notification check...');
        await this.checkAndNotify();
        return { success: true, message: 'Manual check completed' };
    }

    // Gửi báo cáo tổng hợp về tất cả payments sắp đến hạn
    async sendSummaryReport() {
        try {
            const daysAhead = parseInt(process.env.NOTIFICATION_DAYS_BEFORE) || 2;
            const upcomingPayments = await dbOperations.getUpcomingPayments(daysAhead);

            await telegramBot.sendSummaryReport(upcomingPayments);

            return {
                success: true,
                count: upcomingPayments.length,
                message: 'Summary report sent'
            };
        } catch (error) {
            console.error('Error sending summary report:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Kiểm tra trạng thái scheduler
    getStatus() {
        return {
            isRunning: this.isRunning,
            cronExpression: process.env.NOTIFICATION_CHECK_INTERVAL || '0 9 * * *',
            daysAhead: parseInt(process.env.NOTIFICATION_DAYS_BEFORE) || 2,
            telegramEnabled: telegramBot.isEnabled()
        };
    }
}

module.exports = new NotificationScheduler();
