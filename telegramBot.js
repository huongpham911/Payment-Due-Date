const TelegramBot = require('node-telegram-bot-api');
const brandDetector = require('./brandDetector');
const billParser = require('./billParser');
const fs = require('fs');
const path = require('path');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.dbOperations = null; // Will be injected later
        this.setupBot();
    }

    setupBot() {
        try {
            if (!process.env.TELEGRAM_BOT_TOKEN) {
                console.warn('TELEGRAM_BOT_TOKEN not found. Telegram notifications will be disabled.');
                return;
            }

            // Enable polling to receive messages/photos
            this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
                polling: true
            });

            console.log('Telegram bot initialized with polling enabled.');

            // Setup message handlers
            this.setupHandlers();

        } catch (error) {
            console.error('Error setting up Telegram bot:', error.message);
        }
    }

    setupHandlers() {
        if (!this.bot) return;

        // Handle photos (bill scanning)
        this.bot.on('photo', async (msg) => {
            await this.handlePhotoMessage(msg);
        });

        // Handle documents (PDF bills, etc.)
        this.bot.on('document', async (msg) => {
            await this.handleDocumentMessage(msg);
        });

        // Handle text commands
        this.bot.on('message', async (msg) => {
            if (msg.photo || msg.document) return; // Already handled

            const text = msg.text;
            if (text && text.startsWith('/')) {
                await this.handleCommand(msg);
            }
        });

        console.log('✓ Telegram bot handlers setup complete');
    }

    // Inject database operations (to avoid circular dependency)
    setDbOperations(dbOps) {
        this.dbOperations = dbOps;
    }

    async handlePhotoMessage(msg) {
        const chatId = msg.chat.id;

        try {
            await this.bot.sendMessage(chatId, '📸 Đang phân tích hóa đơn...');

            // Get highest resolution photo
            const photos = msg.photo;
            const bestPhoto = photos[photos.length - 1];

            // Download photo
            const fileId = bestPhoto.file_id;
            const file = await this.bot.getFile(fileId);
            const filePath = file.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;

            // Save to temp
            const fetch = require('node-fetch');
            const response = await fetch(fileUrl);
            const buffer = await response.buffer();

            const tempPath = path.join(__dirname, 'temp_bill.jpg');
            fs.writeFileSync(tempPath, buffer);

            // Parse bill
            if (!billParser.isEnabled()) {
                await this.bot.sendMessage(chatId, '❌ Tính năng scan bill chưa được config. Cần ANTHROPIC_API_KEY trong .env');
                return;
            }

            const billData = await billParser.parseBillImage(tempPath);

            // Clean up temp file
            fs.unlinkSync(tempPath);

            // Create payment automatically
            if (this.dbOperations && billData.title && billData.due_date) {
                const payment = await this.createPaymentFromBill(billData);

                await this.bot.sendMessage(chatId,
                    `✅ Đã tạo nhắc nhở thanh toán!\n\n` +
                    `📌 ${payment.title}\n` +
                    `${payment.brand ? `🏢 ${payment.brand}\n` : ''}` +
                    `💰 ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\n` +
                    `📅 Hạn: ${this.formatDate(payment.due_date)}\n` +
                    `${payment.expiry_datetime ? `⏰ Giờ: ${payment.expiry_datetime.split(' ')[1]}\n` : ''}` +
                    `\n🔔 Sẽ nhắc nhở bạn trước hạn!`,
                    { parse_mode: 'HTML' }
                );
            } else {
                // Just show parsed data
                await this.bot.sendMessage(chatId,
                    `📋 Thông tin trích xuất:\n\n` +
                    JSON.stringify(billData, null, 2)
                );
            }

        } catch (error) {
            console.error('Error handling photo:', error);
            await this.bot.sendMessage(chatId,
                `❌ Lỗi khi xử lý ảnh: ${error.message}\n\n` +
                `Vui lòng đảm bảo ảnh rõ ràng và có chứa thông tin hóa đơn.`
            );
        }
    }

    async handleDocumentMessage(msg) {
        const chatId = msg.chat.id;
        await this.bot.sendMessage(chatId, '📄 Tính năng scan document đang được phát triển...');
    }

    async handleCommand(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (text === '/start' || text === '/help') {
            await this.bot.sendMessage(chatId,
                `🤖 <b>Payment Reminder Bot</b>\n\n` +
                `<b>Cách sử dụng:</b>\n` +
                `1️⃣ Chụp ảnh hóa đơn/bill\n` +
                `2️⃣ Gửi ảnh cho bot\n` +
                `3️⃣ Bot tự động phân tích và tạo nhắc nhở\n\n` +
                `<b>Commands:</b>\n` +
                `/help - Hiển thị hướng dẫn\n` +
                `/status - Kiểm tra trạng thái`,
                { parse_mode: 'HTML' }
            );
        } else if (text === '/status') {
            await this.bot.sendMessage(chatId,
                `✅ Bot đang hoạt động\n` +
                `📸 Bill scanning: ${billParser.isEnabled() ? 'Enabled' : 'Disabled'}\n` +
                `💾 Database: ${this.dbOperations ? 'Connected' : 'Not connected'}`
            );
        }
    }

    async createPaymentFromBill(billData) {
        if (!this.dbOperations) {
            throw new Error('Database operations not available');
        }

        // Auto-detect brand if not provided
        const detected = require('./brandDetector').detectBrandFromPayment({
            title: billData.title,
            description: billData.description,
            brand: billData.brand
        });

        // Create expiry_datetime
        let expiry_datetime = null;
        if (billData.due_date && billData.expiry_time) {
            expiry_datetime = `${billData.due_date} ${billData.expiry_time}:00`;
        }

        const payment = {
            title: billData.title,
            description: billData.description || `Auto-created from bill scan`,
            amount: billData.amount,
            due_date: billData.due_date,
            purchase_date: billData.purchase_date,
            brand: billData.brand || detected.brand,
            category: detected.category,
            expiry_datetime: expiry_datetime
        };

        return await this.dbOperations.addPayment(payment);
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

        // Lấy icon cho brand
        const brandIcon = payment.brand ? brandDetector.getBrandIcon(payment.brand) : '📋';
        const brandInfo = payment.brand ? `${brandIcon} <b>Brand:</b> ${payment.brand}\n` : '';
        const categoryInfo = payment.category ? `📂 <b>Category:</b> ${payment.category}\n` : '';

        const message = `
${emoji} <b>CẢNH BÁO THANH TOÁN</b> ${emoji}

<b>Khoản thanh toán sắp đến hạn ${urgency}!</b>

━━━━━━━━━━━━━━━━━━━━━━

${brandInfo}${categoryInfo}📌 <b>Tiêu đề:</b> ${payment.title}

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

        const brandIcon = payment.brand ? brandDetector.getBrandIcon(payment.brand) : '📋';
        const brandInfo = payment.brand ? `${brandIcon} <b>Brand:</b> ${payment.brand}\n` : '';
        const categoryInfo = payment.category ? `📂 <b>Category:</b> ${payment.category}\n` : '';

        const message = `
✅ <b>THÊM KHOẢN THANH TOÁN MỚI</b>

<b>${payment.title}</b>

${brandInfo}${categoryInfo}${payment.description ? `📝 ${payment.description}\n` : ''}💰 Số tiền: ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'Chưa xác định'}
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

        // Nhóm payments theo brand
        const groupedByBrand = {};
        payments.forEach(payment => {
            const brand = payment.brand || 'Chưa phân loại';
            if (!groupedByBrand[brand]) {
                groupedByBrand[brand] = [];
            }
            groupedByBrand[brand].push(payment);
        });

        let message = '📊 <b>BÁO CÁO CÁC KHOẢN THANH TOÁN SẮP ĐẾN HẠN</b>\n\n';

        // Hiển thị theo từng brand
        Object.entries(groupedByBrand).forEach(([brand, brandPayments]) => {
            const brandIcon = brand !== 'Chưa phân loại' ? brandDetector.getBrandIcon(brand) : '📋';
            message += `${brandIcon} <b>${brand}</b>\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

            brandPayments.forEach((payment) => {
                const daysLeft = this.calculateDaysUntilDue(payment.due_date);
                const urgencyEmoji = daysLeft === 0 ? '🚨' : daysLeft === 1 ? '⚠️' : '📅';

                message += `${urgencyEmoji} ${payment.title}\n`;
                message += `   💰 ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\n`;
                message += `   📆 ${this.formatDate(payment.due_date)} (còn ${daysLeft} ngày)\n\n`;
            });
        });

        const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `💵 <b>Tổng số tiền:</b> ${totalAmount.toLocaleString('vi-VN')} VNĐ\n`;
        message += `📝 <b>Tổng số khoản:</b> ${payments.length}`;

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
