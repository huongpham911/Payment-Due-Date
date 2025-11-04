# 💰 Payment Due Date Alert System

Hệ thống quản lý và cảnh báo các khoản thanh toán sắp hết hạn, tích hợp với Google Calendar và gửi thông báo qua Telegram.

## 🌟 Tính năng

- ✅ **Quản lý khoản thanh toán**: Thêm, sửa, xóa các khoản thanh toán cần theo dõi
- 📅 **Đồng bộ Google Calendar**: Tự động tạo và cập nhật events trên Google Calendar
- 📱 **Thông báo Telegram**: Gửi cảnh báo tự động qua Telegram Bot
- ⏰ **Cảnh báo tự động**: Thông báo 1-2 ngày trước khi đến hạn thanh toán
- 🔔 **Scheduler thông minh**: Tự động kiểm tra và gửi thông báo theo lịch
- 🎨 **Giao diện đẹp**: Web interface hiện đại, responsive
- 📊 **Báo cáo tổng hợp**: Gửi báo cáo các khoản thanh toán sắp đến hạn

## 📋 Yêu cầu hệ thống

- Node.js 14.x trở lên
- npm hoặc yarn
- Tài khoản Google (để sử dụng Google Calendar API)
- Telegram Bot Token (để gửi thông báo)

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd Payment-Due-Date
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Google Calendar API

#### Bước 1: Tạo project trên Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Bật Google Calendar API:
   - Vào "APIs & Services" > "Library"
   - Tìm "Google Calendar API" và bật nó

#### Bước 2: Tạo OAuth 2.0 credentials

1. Vào "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Chọn "Web application"
4. Thêm Authorized redirect URIs:
   ```
   http://localhost:3000/auth/google/callback
   ```
5. Lưu Client ID và Client Secret

### 4. Cấu hình Telegram Bot

#### Bước 1: Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi lệnh `/newbot` và làm theo hướng dẫn
3. Lưu lại Bot Token

#### Bước 2: Lấy Chat ID

1. Gửi một tin nhắn bất kỳ cho bot của bạn
2. Truy cập URL sau (thay YOUR_BOT_TOKEN):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Tìm và lưu lại `chat.id` trong response

### 5. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Điền các thông tin vào file `.env`:

```env
# Server Configuration
PORT=3000

# Google Calendar API
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Notification Settings
NOTIFICATION_DAYS_BEFORE=2
NOTIFICATION_CHECK_INTERVAL=0 9 * * *
```

### 6. Khởi động ứng dụng

```bash
npm start
```

Hoặc dùng nodemon để auto-reload:

```bash
npm run dev
```

Truy cập: http://localhost:3000

## 📖 Hướng dẫn sử dụng

### 1. Kết nối Google Calendar

1. Mở web app tại http://localhost:3000
2. Click nút "Kết nối Google Calendar"
3. Đăng nhập và cho phép ứng dụng truy cập Google Calendar
4. Sau khi authorize thành công, status sẽ hiển thị "Đã kết nối"

### 2. Kiểm tra Telegram Bot

1. Click nút "Test Telegram" để kiểm tra kết nối
2. Bạn sẽ nhận được tin nhắn test từ bot nếu cấu hình đúng

### 3. Thêm khoản thanh toán

1. Điền thông tin vào form "Thêm khoản thanh toán mới":
   - **Tiêu đề** (bắt buộc): Tên khoản thanh toán
   - **Mô tả**: Thông tin chi tiết
   - **Số tiền**: Số tiền cần thanh toán (VNĐ)
   - **Hạn thanh toán** (bắt buộc): Ngày đến hạn
2. Click "Thêm khoản thanh toán"
3. Khoản thanh toán sẽ được:
   - Lưu vào database
   - Tạo event trên Google Calendar (nếu đã kết nối)
   - Gửi thông báo qua Telegram (nếu đã cấu hình)

### 4. Quản lý khoản thanh toán

- **Đánh dấu đã thanh toán**: Click nút "Đã thanh toán"
- **Sửa thông tin**: Click nút "Sửa" để chỉnh sửa
- **Xóa**: Click nút "Xóa" để xóa khoản thanh toán

### 5. Cảnh báo tự động

Hệ thống sẽ tự động:
- Kiểm tra các khoản thanh toán sắp đến hạn mỗi ngày lúc 9:00 sáng
- Gửi cảnh báo qua Telegram cho các khoản thanh toán còn 0-2 ngày đến hạn
- Cảnh báo chỉ gửi 1 lần cho mỗi khoản thanh toán

Bạn cũng có thể:
- **Kiểm tra thủ công**: Click nút "Kiểm tra thủ công"
- **Gửi báo cáo**: Click nút "Gửi báo cáo" để nhận báo cáo tổng hợp

## 🔧 Cấu hình nâng cao

### Thay đổi thời gian kiểm tra

Trong file `.env`, sửa `NOTIFICATION_CHECK_INTERVAL` theo cú pháp cron:

```env
# Mỗi ngày lúc 9:00 sáng
NOTIFICATION_CHECK_INTERVAL=0 9 * * *

# Mỗi 6 giờ
NOTIFICATION_CHECK_INTERVAL=0 */6 * * *

# Mỗi ngày lúc 9:00 và 18:00
NOTIFICATION_CHECK_INTERVAL=0 9,18 * * *
```

### Thay đổi số ngày cảnh báo trước

Trong file `.env`, sửa `NOTIFICATION_DAYS_BEFORE`:

```env
# Cảnh báo 3 ngày trước
NOTIFICATION_DAYS_BEFORE=3

# Cảnh báo 1 ngày trước
NOTIFICATION_DAYS_BEFORE=1
```

## 📡 API Endpoints

### Payments

- `GET /api/payments` - Lấy tất cả payments
- `GET /api/payments/:id` - Lấy payment theo ID
- `POST /api/payments` - Tạo payment mới
- `PUT /api/payments/:id` - Cập nhật payment
- `DELETE /api/payments/:id` - Xóa payment
- `GET /api/payments/upcoming/:days` - Lấy payments sắp đến hạn

### Google Calendar

- `GET /auth/google` - Bắt đầu OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /api/google/status` - Kiểm tra trạng thái kết nối

### Telegram

- `GET /api/telegram/test` - Test kết nối Telegram
- `GET /api/telegram/status` - Kiểm tra trạng thái Telegram

### Notifications

- `GET /api/notifications/status` - Kiểm tra trạng thái scheduler
- `POST /api/notifications/check` - Chạy kiểm tra thủ công
- `POST /api/notifications/summary` - Gửi báo cáo tổng hợp

### System

- `GET /api/health` - Health check

## 🗄️ Cấu trúc Database

### Table: payments

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| title | TEXT | Tiêu đề khoản thanh toán |
| description | TEXT | Mô tả chi tiết |
| amount | REAL | Số tiền |
| due_date | DATE | Hạn thanh toán |
| status | TEXT | Trạng thái (pending/paid) |
| google_event_id | TEXT | ID của event trên Google Calendar |
| notified | INTEGER | Đã gửi thông báo chưa (0/1) |
| created_at | DATETIME | Ngày tạo |
| updated_at | DATETIME | Ngày cập nhật |

### Table: settings

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Khóa setting |
| value | TEXT | Giá trị setting |

## 📁 Cấu trúc thư mục

```
Payment-Due-Date/
├── server.js              # Main server file
├── database.js            # Database setup & operations
├── googleCalendar.js      # Google Calendar integration
├── telegramBot.js         # Telegram Bot integration
├── notificationScheduler.js # Notification scheduler
├── package.json           # Dependencies
├── .env                   # Environment variables (tạo từ .env.example)
├── .env.example           # Example environment file
├── .gitignore            # Git ignore rules
├── README.md             # Documentation
└── public/               # Frontend files
    ├── index.html        # Main HTML
    ├── style.css         # Styles
    └── script.js         # Frontend JavaScript
```

## 🐛 Troubleshooting

### Google Calendar không kết nối được

1. Kiểm tra GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env
2. Đảm bảo redirect URI đúng trong Google Cloud Console
3. Xóa file `token.json` và thử kết nối lại

### Telegram không nhận được thông báo

1. Kiểm tra TELEGRAM_BOT_TOKEN trong .env
2. Đảm bảo đã gửi tin nhắn cho bot ít nhất 1 lần
3. Kiểm tra TELEGRAM_CHAT_ID đúng chưa
4. Click "Test Telegram" để kiểm tra kết nối

### Scheduler không chạy

1. Kiểm tra NOTIFICATION_CHECK_INTERVAL có đúng cú pháp cron không
2. Xem logs khi server khởi động
3. Chạy kiểm tra thủ công để test

## 🔒 Bảo mật

- File `.env` đã được thêm vào `.gitignore` - không commit lên Git
- Token và credentials được lưu local
- Nên chạy trên HTTPS khi deploy production
- Giới hạn quyền truy cập Google Calendar API

## 🚢 Deploy Production

### Deploy lên VPS/Server

1. Clone code lên server
2. Cấu hình `.env` với thông tin production
3. Cài đặt PM2 để chạy background:
   ```bash
   npm install -g pm2
   pm2 start server.js --name payment-alerts
   pm2 startup
   pm2 save
   ```
4. Cấu hình Nginx làm reverse proxy
5. Sử dụng Let's Encrypt cho HTTPS

### Deploy lên Heroku

1. Tạo app trên Heroku
2. Set environment variables trên Heroku Dashboard
3. Push code:
   ```bash
   git push heroku main
   ```

## 📝 License

MIT License

## 🤝 Contributing

Contributions, issues và feature requests đều được chào đón!

## 👤 Author

Your Name

## 🙏 Acknowledgments

- Google Calendar API
- Telegram Bot API
- Node.js & Express
- SQLite
