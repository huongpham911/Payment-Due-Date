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
            // Lấy reminder settings
            const settingsData = await dbOperations.getSetting('reminder_days');
            const reminderDays = settingsData ? JSON.parse(settingsData) : [7, 3, 1, 0];

            const remind2hoursData = await dbOperations.getSetting('remind_2hours');
            const remind2hours = remind2hoursData ? JSON.parse(remind2hoursData) : true;

            console.log(`Checking payments - Days: ${reminderDays.join(', ')}, 2h before: ${remind2hours}`);

            const allPayments = await dbOperations.getAllPayments();
            const pendingPayments = allPayments.filter(p => p.status === 'pending');
            let notificationCount = 0;

            for (const payment of pendingPayments) {
                const daysUntilDue = this.calculateDaysUntilDue(payment.due_date);
                const lastNotified = payment.last_notified_days || -1;

                // Check day-based reminders
                if (reminderDays.includes(daysUntilDue) && lastNotified !== daysUntilDue) {
                    console.log(`Sending day notification: ${payment.title} (${daysUntilDue} days)`);
                    const sent = await telegramBot.sendPaymentAlert(payment, daysUntilDue);
                    if (sent) {
                        await dbOperations.updatePayment(payment.id, { last_notified_days: daysUntilDue });
                        notificationCount++;
                    }
                    await this.delay(1000);
                }

                // Check 2-hour-before reminder (if expiry_datetime exists)
                if (remind2hours && payment.expiry_datetime) {
                    const hoursUntilExpiry = this.calculateHoursUntilExpiry(payment.expiry_datetime);

                    if (hoursUntilExpiry >= 1.5 && hoursUntilExpiry <= 2.5 && !payment.notified_2hours) {
                        console.log(`Sending 2h reminder: ${payment.title}`);
                        const sent = await telegramBot.sendPaymentAlert(payment, '2 giờ');
                        if (sent) {
                            await dbOperations.updatePayment(payment.id, { notified_2hours: 1 });
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

    // Tính số giờ đến hạn
    calculateHoursUntilExpiry(expiryDatetime) {
        const now = new Date();
        const expiry = new Date(expiryDatetime);
        const diffMs = expiry - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours;
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
