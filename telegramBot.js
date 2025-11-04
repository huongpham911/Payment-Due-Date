const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.setupBot();
    }

    setupBot() {
        try {
            if (!process.env.TELEGRAM_BOT_TOKEN) {
                console.warn('TELEGRAM_BOT_TOKEN not found. Telegram notifications will be disabled.');
                return;
            }

            this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            console.log('Telegram bot initialized successfully.');
        } catch (error) {
            console.error('Error setting up Telegram bot:', error.message);
        }
    }

    isEnabled() {
        return this.bot !== null && this.chatId;
    }

    // Gửi thông báo đơn giản
    async sendMessage(message) {
        if (!this.isEnabled()) {
            console.warn('Telegram bot not enabled. Message not sent.');
            return false;
        }

        try {
            await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
            return true;
        } catch (error) {
            console.error('Error sending Telegram message:', error.message);
            return false;
        }
    }

    // Gửi thông báo về payment sắp đến hạn
    async sendPaymentAlert(payment, daysUntilDue) {
        if (!this.isEnabled()) {
            console.warn('Telegram bot not enabled. Alert not sent.');
            return false;
        }

        const emoji = daysUntilDue === 0 ? '🚨' : daysUntilDue === 1 ? '⚠️' : '📅';
        const urgency = daysUntilDue === 0 ? 'HÔM NAY' :
                       daysUntilDue === 1 ? 'NGÀY MAI' :
                       `${daysUntilDue} NGÀY NỮA`;

        const message = `
${emoji} <b>CẢNH BÁO THANH TOÁN</b> ${emoji}

<b>Khoản thanh toán sắp đến hạn ${urgency}!</b>

━━━━━━━━━━━━━━━━━━━━━━

📌 <b>Tiêu đề:</b> ${payment.title}

${payment.description ? `📝 <b>Mô tả:</b> ${payment.description}\n\n` : ''}💰 <b>Số tiền:</b> ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'Chưa xác định'}

📆 <b>Hạn thanh toán:</b> ${this.formatDate(payment.due_date)}

⏰ <b>Còn lại:</b> ${urgency}

━━━━━━━━━━━━━━━━━━━━━━

⚡ Vui lòng thanh toán đúng hạn để tránh phí phạt!
        `.trim();

        return await this.sendMessage(message);
    }

    // Gửi thông báo về payment mới được tạo
    async sendPaymentCreatedNotification(payment) {
        if (!this.isEnabled()) {
            return false;
        }

        const message = `
✅ <b>THÊM KHOẢN THANH TOÁN MỚI</b>

<b>${payment.title}</b>

${payment.description ? `📝 ${payment.description}\n` : ''}💰 Số tiền: ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'Chưa xác định'}
📆 Hạn thanh toán: ${this.formatDate(payment.due_date)}

✓ Đã đồng bộ với Google Calendar
        `.trim();

        return await this.sendMessage(message);
    }

    // Gửi thông báo về payment đã được cập nhật
    async sendPaymentUpdatedNotification(payment) {
        if (!this.isEnabled()) {
            return false;
        }

        const statusEmoji = payment.status === 'paid' ? '✅' : '⏳';
        const statusText = payment.status === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN';

        const message = `
🔄 <b>CẬP NHẬT KHOẢN THANH TOÁN</b>

<b>${payment.title}</b>

${statusEmoji} <b>Trạng thái:</b> ${statusText}
💰 Số tiền: ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'Chưa xác định'}
📆 Hạn thanh toán: ${this.formatDate(payment.due_date)}
        `.trim();

        return await this.sendMessage(message);
    }

    // Gửi thông báo về payment đã bị xóa
    async sendPaymentDeletedNotification(payment) {
        if (!this.isEnabled()) {
            return false;
        }

        const message = `
🗑️ <b>XÓA KHOẢN THANH TOÁN</b>

<b>${payment.title}</b> đã được xóa khỏi danh sách.
        `.trim();

        return await this.sendMessage(message);
    }

    // Gửi summary report
    async sendSummaryReport(payments) {
        if (!this.isEnabled()) {
            return false;
        }

        if (payments.length === 0) {
            const message = '✨ <b>BÁO CÁO THANH TOÁN</b>\n\nKhông có khoản thanh toán nào sắp đến hạn. Tuyệt vời! 🎉';
            return await this.sendMessage(message);
        }

        let message = '📊 <b>BÁO CÁO CÁC KHOẢN THANH TOÁN SẮP ĐẾN HẠN</b>\n\n';

        payments.forEach((payment, index) => {
            const daysLeft = this.calculateDaysUntilDue(payment.due_date);
            const urgencyEmoji = daysLeft === 0 ? '🚨' : daysLeft === 1 ? '⚠️' : '📅';

            message += `${urgencyEmoji} <b>${index + 1}. ${payment.title}</b>\n`;
            message += `   💰 ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\n`;
            message += `   📆 ${this.formatDate(payment.due_date)} (còn ${daysLeft} ngày)\n\n`;
        });

        const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `💵 <b>Tổng số tiền:</b> ${totalAmount.toLocaleString('vi-VN')} VNĐ`;

        return await this.sendMessage(message);
    }

    // Format date theo định dạng Việt Nam
    formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
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

    // Test connection
    async testConnection() {
        if (!this.isEnabled()) {
            return { success: false, message: 'Telegram bot not configured' };
        }

        try {
            const me = await this.bot.getMe();
            await this.sendMessage('🤖 <b>Test Connection Successful!</b>\n\nTelegram bot đang hoạt động bình thường.');
            return {
                success: true,
                message: 'Connected successfully',
                botInfo: me
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = new TelegramBotService();
