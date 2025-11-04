const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = null;
        this.calendar = null;
        this.setupClient();
    }

    setupClient() {
        try {
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            // Đọc token nếu đã có
            const tokenPath = path.join(__dirname, 'token.json');
            if (fs.existsSync(tokenPath)) {
                const token = JSON.parse(fs.readFileSync(tokenPath));
                this.oauth2Client.setCredentials(token);
                this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            }
        } catch (error) {
            console.error('Error setting up Google Calendar client:', error.message);
        }
    }

    // Lấy URL để authorize
    getAuthUrl() {
        const SCOPES = ['https://www.googleapis.com/auth/calendar'];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
    }

    // Xử lý callback và lưu token
    async handleAuthCallback(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Lưu token vào file
            const tokenPath = path.join(__dirname, 'token.json');
            fs.writeFileSync(tokenPath, JSON.stringify(tokens));

            this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            return true;
        } catch (error) {
            console.error('Error getting access token:', error.message);
            return false;
        }
    }

    // Kiểm tra xem đã authorize chưa
    isAuthorized() {
        return this.calendar !== null;
    }

    // Tạo event trên Google Calendar
    async createEvent(payment) {
        if (!this.isAuthorized()) {
            throw new Error('Not authorized. Please complete Google Calendar authorization first.');
        }

        try {
            const event = {
                summary: `💰 Thanh toán: ${payment.title}`,
                description: `${payment.description || ''}\n\nSố tiền: ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\nTrạng thái: Chưa thanh toán`,
                start: {
                    date: payment.due_date,
                    timeZone: 'Asia/Ho_Chi_Minh',
                },
                end: {
                    date: payment.due_date,
                    timeZone: 'Asia/Ho_Chi_Minh',
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 24 * 60 }, // 1 ngày trước
                        { method: 'popup', minutes: 48 * 60 }, // 2 ngày trước
                    ],
                },
                colorId: '11', // Màu đỏ cho payment deadlines
            };

            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            return response.data.id;
        } catch (error) {
            console.error('Error creating calendar event:', error.message);
            throw error;
        }
    }

    // Cập nhật event trên Google Calendar
    async updateEvent(eventId, payment) {
        if (!this.isAuthorized()) {
            throw new Error('Not authorized. Please complete Google Calendar authorization first.');
        }

        try {
            const event = {
                summary: `💰 Thanh toán: ${payment.title}`,
                description: `${payment.description || ''}\n\nSố tiền: ${payment.amount ? payment.amount.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\nTrạng thái: ${payment.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}`,
                start: {
                    date: payment.due_date,
                    timeZone: 'Asia/Ho_Chi_Minh',
                },
                end: {
                    date: payment.due_date,
                    timeZone: 'Asia/Ho_Chi_Minh',
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 24 * 60 },
                        { method: 'popup', minutes: 48 * 60 },
                    ],
                },
                colorId: payment.status === 'paid' ? '10' : '11', // Xanh nếu đã thanh toán, đỏ nếu chưa
            };

            await this.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: event,
            });

            return true;
        } catch (error) {
            console.error('Error updating calendar event:', error.message);
            throw error;
        }
    }

    // Xóa event khỏi Google Calendar
    async deleteEvent(eventId) {
        if (!this.isAuthorized()) {
            throw new Error('Not authorized. Please complete Google Calendar authorization first.');
        }

        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
            });
            return true;
        } catch (error) {
            console.error('Error deleting calendar event:', error.message);
            throw error;
        }
    }

    // Lấy các events sắp tới
    async getUpcomingEvents(maxResults = 10) {
        if (!this.isAuthorized()) {
            throw new Error('Not authorized. Please complete Google Calendar authorization first.');
        }

        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: maxResults,
                singleEvents: true,
                orderBy: 'startTime',
            });

            return response.data.items;
        } catch (error) {
            console.error('Error getting calendar events:', error.message);
            throw error;
        }
    }
}

module.exports = new GoogleCalendarService();
