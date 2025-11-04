# 🚀 Hướng dẫn cài đặt chi tiết

Tài liệu này sẽ hướng dẫn bạn từng bước để cài đặt và chạy Payment Due Date Alert System.

## 📦 Bước 1: Chuẩn bị môi trường

### Cài đặt Node.js

1. Truy cập https://nodejs.org/
2. Tải và cài đặt phiên bản LTS (Long Term Support)
3. Kiểm tra cài đặt thành công:
   ```bash
   node --version
   npm --version
   ```

## 📥 Bước 2: Tải và cài đặt code

### Clone repository và cài đặt dependencies

```bash
# Clone repository
git clone <repository-url>
cd Payment-Due-Date

# Cài đặt các thư viện cần thiết
npm install
```

## 🔑 Bước 3: Cấu hình Google Calendar API

### 3.1. Tạo Google Cloud Project

1. **Truy cập Google Cloud Console**
   - Mở https://console.cloud.google.com/
   - Đăng nhập bằng tài khoản Google của bạn

2. **Tạo project mới**
   - Click vào dropdown project ở góc trên bên trái
   - Click "New Project"
   - Đặt tên project: `Payment-Due-Date-Alerts`
   - Click "Create"

### 3.2. Bật Google Calendar API

1. **Vào thư viện API**
   - Trong menu bên trái, chọn "APIs & Services" > "Library"
   - Hoặc truy cập: https://console.cloud.google.com/apis/library

2. **Tìm và bật Google Calendar API**
   - Tìm kiếm "Google Calendar API"
   - Click vào kết quả
   - Click nút "Enable" (Bật)

### 3.3. Tạo OAuth 2.0 Credentials

1. **Tạo OAuth consent screen** (lần đầu tiên)
   - Vào "APIs & Services" > "OAuth consent screen"
   - Chọn "External" > Click "Create"
   - Điền thông tin:
     - App name: `Payment Due Date Alerts`
     - User support email: email của bạn
     - Developer contact: email của bạn
   - Click "Save and Continue"
   - Bỏ qua phần Scopes, click "Save and Continue"
   - Bỏ qua phần Test users (hoặc thêm email của bạn)
   - Click "Save and Continue"

2. **Tạo Credentials**
   - Vào "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: chọn "Web application"
   - Name: `Payment Alerts Web Client`
   - Authorized redirect URIs: Click "Add URI" và thêm:
     ```
     http://localhost:3000/auth/google/callback
     ```
   - Click "Create"

3. **Lưu thông tin**
   - Bạn sẽ thấy một popup hiển thị:
     - Client ID (dạng: xxx.apps.googleusercontent.com)
     - Client Secret
   - **QUAN TRỌNG**: Copy và lưu lại 2 thông tin này!

## 📱 Bước 4: Cấu hình Telegram Bot

### 4.1. Tạo Telegram Bot

1. **Mở Telegram**
   - Mở app Telegram trên điện thoại hoặc web

2. **Tìm BotFather**
   - Tìm kiếm "@BotFather" hoặc truy cập: https://t.me/botfather
   - Đây là bot chính thức của Telegram để tạo và quản lý bot

3. **Tạo bot mới**
   - Gửi lệnh: `/newbot`
   - BotFather sẽ hỏi tên bot, ví dụ: `My Payment Alerts Bot`
   - Sau đó hỏi username, phải kết thúc bằng "bot", ví dụ: `my_payment_alerts_bot`
   - BotFather sẽ trả về **Bot Token** (dạng: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
   - **QUAN TRỌNG**: Copy và lưu lại token này!

### 4.2. Lấy Chat ID

**Phương pháp 1: Sử dụng bot khác (Dễ nhất)**

1. Tìm bot "@userinfobot" trên Telegram
2. Start bot và nó sẽ gửi cho bạn Chat ID

**Phương pháp 2: Sử dụng API**

1. Gửi một tin nhắn bất kỳ cho bot bạn vừa tạo (ví dụ: "Hello")
2. Mở trình duyệt và truy cập URL sau (thay YOUR_BOT_TOKEN bằng token ở trên):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Bạn sẽ thấy JSON response, tìm `"chat":{"id":123456789`
4. Số `123456789` chính là Chat ID của bạn
5. **QUAN TRỌNG**: Lưu lại Chat ID này!

## ⚙️ Bước 5: Cấu hình file .env

1. **Tạo file .env**
   ```bash
   # Copy từ file mẫu
   cp .env.example .env
   ```

2. **Mở file .env bằng text editor**
   ```bash
   # Trên Linux/Mac
   nano .env

   # Hoặc mở bằng editor bất kỳ
   ```

3. **Điền thông tin đã lưu ở các bước trước**
   ```env
   # Server Configuration
   PORT=3000

   # Google Calendar API
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

   # Telegram Bot
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID=123456789

   # Notification Settings
   NOTIFICATION_DAYS_BEFORE=2
   NOTIFICATION_CHECK_INTERVAL=0 9 * * *
   ```

4. **Lưu file**
   - Nhấn Ctrl+X, sau đó Y, sau đó Enter (nếu dùng nano)

## 🎯 Bước 6: Chạy ứng dụng

### Khởi động server

```bash
npm start
```

Bạn sẽ thấy thông báo:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   💰 Payment Due Date Alert System                            ║
║                                                               ║
║   Server đang chạy tại: http://localhost:3000                ║
║                                                               ║
║   📅 Google Calendar: ✗ Not connected                        ║
║   📱 Telegram Bot: ✓ Enabled                                 ║
║   🔔 Scheduler: ✓ Running                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## 🌐 Bước 7: Kết nối Google Calendar

1. **Mở trình duyệt**
   - Truy cập: http://localhost:3000

2. **Click nút "Kết nối Google Calendar"**
   - Một tab mới sẽ mở ra
   - Đăng nhập Google (nếu chưa đăng nhập)
   - Chọn tài khoản Google bạn muốn dùng

3. **Cho phép quyền truy cập**
   - Google sẽ hỏi xác nhận cho phép app truy cập Calendar
   - Click "Allow" (Cho phép)

4. **Hoàn tất**
   - Tab sẽ hiển thị "Google Calendar đã kết nối!"
   - Đóng tab và quay lại trang chính
   - Status sẽ hiển thị "✓ Đã kết nối"

## ✅ Bước 8: Kiểm tra Telegram

1. **Click nút "Test Telegram"**
   - Trên web interface, click nút "Test Telegram"

2. **Kiểm tra Telegram**
   - Mở app Telegram
   - Vào chat với bot của bạn
   - Bạn sẽ nhận được tin nhắn test từ bot

3. **Nếu không nhận được tin nhắn**
   - Kiểm tra lại Bot Token trong file .env
   - Kiểm tra lại Chat ID trong file .env
   - Đảm bảo đã gửi ít nhất 1 tin nhắn cho bot trước đó

## 🎉 Bước 9: Thử nghiệm

### Thêm khoản thanh toán thử

1. **Điền form trên web**
   - Tiêu đề: "Test - Tiền điện tháng 11"
   - Mô tả: "Hóa đơn tiền điện"
   - Số tiền: 500000
   - Hạn thanh toán: Chọn ngày mai

2. **Click "Thêm khoản thanh toán"**

3. **Kiểm tra kết quả**
   - Khoản thanh toán xuất hiện trong danh sách
   - Mở Google Calendar, bạn sẽ thấy event mới
   - Kiểm tra Telegram, bạn sẽ nhận được thông báo

### Thử nghiệm cảnh báo tự động

1. **Kiểm tra thủ công**
   - Click nút "Kiểm tra thủ công"
   - Nếu có khoản thanh toán sắp đến hạn (0-2 ngày), bạn sẽ nhận thông báo

2. **Gửi báo cáo**
   - Click nút "Gửi báo cáo"
   - Telegram sẽ nhận được báo cáo tổng hợp

## 🔧 Customization

### Thay đổi thời gian kiểm tra

Mặc định, hệ thống kiểm tra lúc 9:00 sáng mỗi ngày. Để thay đổi:

1. Mở file .env
2. Sửa dòng `NOTIFICATION_CHECK_INTERVAL`

**Ví dụ cú pháp cron:**

```env
# Mỗi ngày lúc 8:00 sáng
NOTIFICATION_CHECK_INTERVAL=0 8 * * *

# Mỗi ngày lúc 9:00 sáng và 6:00 chiều
NOTIFICATION_CHECK_INTERVAL=0 9,18 * * *

# Mỗi 6 tiếng một lần
NOTIFICATION_CHECK_INTERVAL=0 */6 * * *

# Mỗi giờ
NOTIFICATION_CHECK_INTERVAL=0 * * * *
```

**Giải thích cú pháp cron:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Ngày trong tuần (0 - 7) (0 hoặc 7 là Chủ nhật)
│ │ │ └───── Tháng (1 - 12)
│ │ └─────── Ngày trong tháng (1 - 31)
│ └───────── Giờ (0 - 23)
└─────────── Phút (0 - 59)
```

### Thay đổi số ngày cảnh báo trước

Mặc định, hệ thống cảnh báo 2 ngày trước. Để thay đổi:

```env
# Cảnh báo 1 ngày trước
NOTIFICATION_DAYS_BEFORE=1

# Cảnh báo 3 ngày trước
NOTIFICATION_DAYS_BEFORE=3

# Cảnh báo 7 ngày trước (1 tuần)
NOTIFICATION_DAYS_BEFORE=7
```

## ❓ Xử lý sự cố thường gặp

### Lỗi: "Cannot find module"

**Nguyên nhân**: Chưa cài đặt dependencies

**Giải pháp**:
```bash
npm install
```

### Lỗi: "EADDRINUSE: address already in use"

**Nguyên nhân**: Port 3000 đã được sử dụng

**Giải pháp**:
```bash
# Thay đổi PORT trong .env
PORT=3001
```

### Google Calendar không kết nối

**Kiểm tra**:
1. GOOGLE_CLIENT_ID đúng chưa?
2. GOOGLE_CLIENT_SECRET đúng chưa?
3. Redirect URI có khớp không?

**Giải pháp**:
```bash
# Xóa token cũ và thử lại
rm token.json
# Khởi động lại server
npm start
```

### Telegram không gửi được thông báo

**Kiểm tra**:
1. Bot Token đúng chưa?
2. Chat ID đúng chưa?
3. Đã gửi tin nhắn cho bot chưa?

**Giải pháp**:
```bash
# Test kết nối trong browser
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

### Database bị lỗi

**Giải pháp**:
```bash
# Xóa database và tạo lại
rm payments.db
# Khởi động lại server (sẽ tự tạo database mới)
npm start
```

## 📱 Chạy ở chế độ development

Để tự động restart khi code thay đổi:

```bash
npm run dev
```

## 🎓 Tips & Tricks

### 1. Xem logs realtime

```bash
npm start | tee logs.txt
```

### 2. Chạy trong background (Linux/Mac)

```bash
# Sử dụng screen
screen -S payment-alerts
npm start
# Nhấn Ctrl+A+D để detach

# Quay lại
screen -r payment-alerts
```

### 3. Chạy với PM2 (Production)

```bash
# Cài đặt PM2
npm install -g pm2

# Chạy app
pm2 start server.js --name payment-alerts

# Xem logs
pm2 logs payment-alerts

# Restart
pm2 restart payment-alerts

# Stop
pm2 stop payment-alerts
```

## 🎯 Next Steps

Sau khi cài đặt thành công, bạn có thể:

1. **Thêm nhiều khoản thanh toán**
2. **Tùy chỉnh thông báo** trong file `telegramBot.js`
3. **Thay đổi giao diện** trong `public/style.css`
4. **Thêm tính năng mới** theo ý bạn
5. **Deploy lên server** để chạy 24/7

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Đọc lại hướng dẫn cẩn thận
2. Kiểm tra logs trong console
3. Xem phần "Xử lý sự cố" ở trên
4. Tạo issue trên GitHub

---

Chúc bạn sử dụng thành công! 🎉
