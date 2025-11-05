# 📸 AI Bill Scanning Feature

**Gửi ảnh hoặc text hóa đơn** vào Telegram Bot → AI tự động phân tích → Tạo nhắc nhở thanh toán!

## 🎯 Tính năng

- **AI Vision**: Sử dụng Claude 3.5 Sonnet để đọc hóa đơn
- **Tự động extract**:
  - Tên dịch vụ/sản phẩm
  - Thương hiệu (Netflix, Shopee, Điện, Nước, v.v.)
  - Số tiền
  - Ngày mua
  - Ngày hết hạn
  - Giờ hết hạn (nếu có)
- **Auto brand detection**: Nhận diện brand từ logo/text
- **Tự động tạo payment**: Lưu vào database và setup nhắc nhở
- **Telegram bot commands**: `/help`, `/status`

## ⚙️ Setup

### 1. Cài đặt dependencies

```bash
npm install @anthropic-ai/sdk node-fetch
```

### 2. Lấy Claude API Key

1. Truy cập: https://console.anthropic.com/
2. Tạo API key
3. Copy key

### 3. Cấu hình .env

```bash
# Telegram Bot (bắt buộc)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=your_chat_id

# Claude API for Bill Scanning (bắt buộc cho tính năng này)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional
PORT=3000
NOTIFICATION_CHECK_INTERVAL=0 * * * *
```

### 4. Lấy Telegram Bot Token & Chat ID

**Tạo Bot:**
1. Tìm @BotFather trên Telegram
2. Gửi `/newbot`
3. Đặt tên bot
4. Copy token nhận được

**Lấy Chat ID:**
1. Tìm @userinfobot
2. Gửi bất kỳ tin nhắn nào
3. Copy `Id` field

## 🚀 Sử dụng

### 1. Start server

```bash
npm start
```

### 2. Gửi bill vào Telegram (2 cách)

#### Cách 1: Gửi ảnh 📸
1. Mở Telegram, tìm bot của bạn
2. Chụp ảnh hóa đơn (Netflix, Shopee, Điện, Nước, v.v.)
3. Gửi ảnh cho bot

#### Cách 2: Paste text 📝
1. Copy text từ email/SMS hóa đơn
2. Paste vào chat với bot
3. Hoặc forward message từ bank/shop

### 3. Bot tự động xử lý

**Từ ảnh:**
```
Bot: 📸 Đang phân tích hóa đơn...
Bot: ✅ Đã tạo nhắc nhở thanh toán!
```

**Từ text:**
```
You: Netflix Premium
     Số tiền: 299,000 VNĐ
     Ngày mua: 05/01/2025
     Hết hạn: 05/02/2025

Bot: 📝 Đang phân tích text hóa đơn...
Bot: ✅ Đã tạo nhắc nhở thanh toán từ text!

📌 Netflix Premium Subscription
🏢 Netflix
💰 299,000 VNĐ
📅 Hạn: 05/02/2025
⏰ Giờ: 23:59:00

🔔 Sẽ nhắc nhở bạn trước hạn!
```

### 4. Nhận cảnh báo tự động

Bot sẽ tự động gửi thông báo:
- 7 ngày trước
- 3 ngày trước
- 1 ngày trước
- Ngày đến hạn
- 2 giờ trước giờ hết hạn (nếu có)

## 📱 Commands

- `/start` hoặc `/help` - Hướng dẫn sử dụng
- `/status` - Kiểm tra trạng thái bot

## 🖼️ Loại input support

### Ảnh 📸
- ✅ Hóa đơn điện, nước, internet
- ✅ Bill subscription (Netflix, Spotify, etc.)
- ✅ Hóa đơn mua sắm online (Shopee, Lazada)
- ✅ Receipt từ nhà hàng, cafe
- ✅ Invoice dịch vụ
- ✅ Screenshot email hóa đơn
- ✅ Photo bill giấy

### Text 📝
- ✅ Copy từ email confirmation
- ✅ SMS thông báo từ bank
- ✅ Forward message từ shop/service
- ✅ Text từ bill PDF
- ✅ Chat message về thanh toán
- ✅ Bất kỳ text nào có thông tin: tên, số tiền, ngày hết hạn

## 💡 Tips

### Cho ảnh:
- **Ảnh rõ nét**: Đảm bảo text trên bill rõ ràng
- **Đủ sáng**: Chụp dưới ánh sáng tốt
- **Full bill**: Chụp toàn bộ hóa đơn, không crop

### Cho text:
- **Đủ thông tin**: Cần ít nhất tên dịch vụ + ngày hết hạn
- **Format tự do**: Không cần format cố định, AI sẽ tự hiểu
- **Ví dụ tốt**:
  ```
  Netflix Premium monthly
  Thanh toán: 299,000đ
  Hết hạn 05/02/2025
  ```

### Chung:
- **Ngôn ngữ**: Support cả tiếng Việt và tiếng Anh
- **Mix cũng OK**: "Netflix Premium, 299k VNĐ, expire 05/02/2025"

## 🔧 Troubleshooting

### Bot không phản hồi
- Kiểm tra `TELEGRAM_BOT_TOKEN` đúng chưa
- Kiểm tra bot đã được start chưa (`/start`)

### Lỗi "Bill scanning disabled"
- Kiểm tra `ANTHROPIC_API_KEY` trong .env
- Restart server sau khi thêm key

### Phân tích sai thông tin
- Đảm bảo ảnh rõ, đủ sáng
- Thử chụp lại với góc nhìn tốt hơn
- Screenshot thay vì chụp màn hình

## 📊 Example Bills

### Netflix Subscription
```json
{
  "title": "Netflix Premium",
  "brand": "Netflix",
  "amount": 299000,
  "currency": "VND",
  "purchase_date": "2025-01-05",
  "due_date": "2025-02-05",
  "expiry_time": "23:59"
}
```

### Electricity Bill
```json
{
  "title": "Tiền điện tháng 1/2025",
  "brand": "Electricity",
  "amount": 450000,
  "due_date": "2025-02-10"
}
```

## 🔐 Security

- ⚠️ **Không share bot token** với ai
- ⚠️ **API key phải giữ bí mật**
- ⚠️ Ảnh bill được xóa ngay sau khi xử lý
- ⚠️ Không lưu ảnh trên server

## 💰 Chi phí

**Claude API Pricing** (tính năng bill scanning):
- Claude 3.5 Sonnet: ~$3 per 1M input tokens
- Trung bình 1 ảnh bill: ~1000-2000 tokens
- **Chi phí**: ~$0.003-0.006 per bill (~70-140 VNĐ/bill)

**Free tier**: Anthropic cung cấp $5 credit miễn phí → ~1000 bills

## 🆘 Support

Issues? Create issue tại: https://github.com/huongpham911/Payment-Due-Date/issues
