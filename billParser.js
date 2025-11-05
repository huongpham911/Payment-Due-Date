const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

class BillParser {
    constructor() {
        this.client = null;
        if (process.env.ANTHROPIC_API_KEY) {
            this.client = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
        }
    }

    isEnabled() {
        return this.client !== null;
    }

    /**
     * Parse bill image using Claude Vision
     * @param {string} imagePath - Path to bill image
     * @returns {object} Parsed bill data
     */
    async parseBillImage(imagePath) {
        if (!this.isEnabled()) {
            throw new Error('ANTHROPIC_API_KEY not configured');
        }

        try {
            // Read image as base64
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            // Detect image type
            const ext = imagePath.split('.').pop().toLowerCase();
            const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';

            const message = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: `Phân tích hóa đơn/bill này và trích xuất thông tin sau dưới dạng JSON:

{
  "title": "Tên dịch vụ/sản phẩm",
  "brand": "Tên thương hiệu (Netflix, Shopee, Điện, Nước, etc.)",
  "amount": số tiền (chỉ số, không có ký tự),
  "currency": "VND" hoặc tiền tệ khác,
  "purchase_date": "YYYY-MM-DD" (ngày mua/thanh toán),
  "due_date": "YYYY-MM-DD" (hạn thanh toán/ngày hết hạn),
  "expiry_time": "HH:MM" (nếu có giờ cụ thể),
  "description": "Mô tả ngắn"
}

Lưu ý:
- Nếu không tìm thấy thông tin nào, trả về null
- Tự động nhận diện brand từ logo/text
- Due date có thể là ngày hết hạn subscription, hạn thanh toán, v.v.
- Chỉ trả về JSON, không giải thích thêm`
                        }
                    ]
                }]
            });

            const responseText = message.content[0].text;

            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Cannot extract JSON from Claude response');
            }

            const billData = JSON.parse(jsonMatch[0]);

            console.log('✓ Bill parsed successfully:', billData);
            return billData;

        } catch (error) {
            console.error('Error parsing bill:', error.message);
            throw error;
        }
    }

    /**
     * Parse bill from text (for forwarded messages)
     */
    async parseBillText(text) {
        if (!this.isEnabled()) {
            throw new Error('ANTHROPIC_API_KEY not configured');
        }

        try {
            const message = await this.client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 512,
                messages: [{
                    role: 'user',
                    content: `Từ text hóa đơn này, trích xuất thông tin dưới dạng JSON:

${text}

Format:
{
  "title": "...",
  "brand": "...",
  "amount": số,
  "purchase_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "description": "..."
}

Chỉ trả về JSON.`
                }]
            });

            const responseText = message.content[0].text;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                return null;
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing bill text:', error.message);
            return null;
        }
    }
}

module.exports = new BillParser();
