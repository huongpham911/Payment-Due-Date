// Brand Detection Utility
// Tự động phát hiện thương hiệu và phân loại dựa trên từ khóa

// Danh sách các thương hiệu và từ khóa liên quan
const brandKeywords = {
    // AI & Technology Services
    'ChatGPT': {
        keywords: ['chatgpt', 'chat gpt', 'openai', 'gpt'],
        category: 'AI Services',
        icon: '🤖'
    },
    'Gemini': {
        keywords: ['gemini', 'google ai', 'bard'],
        category: 'AI Services',
        icon: '✨'
    },
    'Claude': {
        keywords: ['claude', 'anthropic'],
        category: 'AI Services',
        icon: '🧠'
    },
    'Midjourney': {
        keywords: ['midjourney', 'mid journey'],
        category: 'AI Services',
        icon: '🎨'
    },

    // Entertainment & Streaming
    'Netflix': {
        keywords: ['netflix'],
        category: 'Entertainment',
        icon: '🎬'
    },
    'YouTube Premium': {
        keywords: ['youtube premium', 'youtube', 'yt premium'],
        category: 'Entertainment',
        icon: '📺'
    },
    'Spotify': {
        keywords: ['spotify'],
        category: 'Entertainment',
        icon: '🎵'
    },
    'Apple Music': {
        keywords: ['apple music', 'applemusic'],
        category: 'Entertainment',
        icon: '🎼'
    },
    'Disney+': {
        keywords: ['disney', 'disney plus', 'disney+'],
        category: 'Entertainment',
        icon: '🏰'
    },
    'HBO': {
        keywords: ['hbo', 'hbo max', 'hbo go'],
        category: 'Entertainment',
        icon: '🎭'
    },

    // Cloud Storage & Productivity
    'Google Drive': {
        keywords: ['google drive', 'drive', 'google one'],
        category: 'Cloud Storage',
        icon: '☁️'
    },
    'Dropbox': {
        keywords: ['dropbox'],
        category: 'Cloud Storage',
        icon: '📦'
    },
    'iCloud': {
        keywords: ['icloud', 'apple cloud'],
        category: 'Cloud Storage',
        icon: '☁️'
    },
    'Microsoft 365': {
        keywords: ['microsoft 365', 'office 365', 'microsoft office'],
        category: 'Productivity',
        icon: '📊'
    },
    'Notion': {
        keywords: ['notion'],
        category: 'Productivity',
        icon: '📝'
    },

    // Development & Tools
    'GitHub': {
        keywords: ['github', 'github pro', 'github copilot'],
        category: 'Development',
        icon: '💻'
    },
    'AWS': {
        keywords: ['aws', 'amazon web services'],
        category: 'Cloud Computing',
        icon: '🌐'
    },
    'Vercel': {
        keywords: ['vercel'],
        category: 'Cloud Computing',
        icon: '▲'
    },
    'Heroku': {
        keywords: ['heroku'],
        category: 'Cloud Computing',
        icon: '🟣'
    },

    // Utilities
    'Electricity': {
        keywords: ['điện', 'electric', 'evn', 'tiền điện', 'electricity'],
        category: 'Utilities',
        icon: '⚡'
    },
    'Water': {
        keywords: ['nước', 'water', 'tiền nước', 'water bill'],
        category: 'Utilities',
        icon: '💧'
    },
    'Internet': {
        keywords: ['internet', 'wifi', 'mạng', 'vnpt', 'viettel', 'fpt'],
        category: 'Utilities',
        icon: '🌐'
    },
    'Mobile Phone': {
        keywords: ['điện thoại', 'phone', 'mobile', 'sim', 'vinaphone', 'mobifone'],
        category: 'Utilities',
        icon: '📱'
    },

    // Insurance & Finance
    'Insurance': {
        keywords: ['bảo hiểm', 'insurance', 'bh'],
        category: 'Insurance',
        icon: '🛡️'
    },
    'Bank': {
        keywords: ['ngân hàng', 'bank', 'vietcombank', 'techcombank', 'vcb', 'tcb'],
        category: 'Banking',
        icon: '🏦'
    },

    // Education
    'Coursera': {
        keywords: ['coursera'],
        category: 'Education',
        icon: '🎓'
    },
    'Udemy': {
        keywords: ['udemy'],
        category: 'Education',
        icon: '📚'
    },

    // E-commerce & Services
    'Amazon': {
        keywords: ['amazon', 'amazon prime'],
        category: 'E-commerce',
        icon: '📦'
    },
    'Shopee': {
        keywords: ['shopee'],
        category: 'E-commerce',
        icon: '🛒'
    },
    'Lazada': {
        keywords: ['lazada'],
        category: 'E-commerce',
        icon: '🛍️'
    }
};

// Categories mapping
const categories = {
    'AI Services': { icon: '🤖', color: '#8B5CF6' },
    'Entertainment': { icon: '🎬', color: '#EF4444' },
    'Cloud Storage': { icon: '☁️', color: '#3B82F6' },
    'Productivity': { icon: '📊', color: '#10B981' },
    'Development': { icon: '💻', color: '#F59E0B' },
    'Cloud Computing': { icon: '🌐', color: '#06B6D4' },
    'Utilities': { icon: '⚡', color: '#84CC16' },
    'Insurance': { icon: '🛡️', color: '#6366F1' },
    'Banking': { icon: '🏦', color: '#EC4899' },
    'Education': { icon: '🎓', color: '#14B8A6' },
    'E-commerce': { icon: '🛒', color: '#F97316' }
};

/**
 * Phát hiện brand từ text (title hoặc description)
 * @param {string} text - Text cần phân tích
 * @returns {object|null} - { brand, category, icon } hoặc null nếu không tìm thấy
 */
function detectBrand(text) {
    if (!text) return null;

    const normalizedText = text.toLowerCase().trim();

    // Tìm kiếm brand theo từ khóa
    for (const [brandName, brandData] of Object.entries(brandKeywords)) {
        for (const keyword of brandData.keywords) {
            if (normalizedText.includes(keyword.toLowerCase())) {
                return {
                    brand: brandName,
                    category: brandData.category,
                    icon: brandData.icon
                };
            }
        }
    }

    return null;
}

/**
 * Phát hiện brand từ payment object
 * @param {object} payment - Payment object với title và description
 * @returns {object} - { brand, category } đã được phát hiện hoặc giá trị mặc định
 */
function detectBrandFromPayment(payment) {
    // Nếu đã có brand và category, giữ nguyên
    if (payment.brand && payment.category) {
        return {
            brand: payment.brand,
            category: payment.category
        };
    }

    // Thử phát hiện từ title
    let detected = detectBrand(payment.title);

    // Nếu không tìm thấy từ title, thử từ description
    if (!detected && payment.description) {
        detected = detectBrand(payment.description);
    }

    if (detected) {
        return {
            brand: detected.brand,
            category: detected.category
        };
    }

    // Nếu không phát hiện được, giữ giá trị có sẵn hoặc null
    return {
        brand: payment.brand || null,
        category: payment.category || null
    };
}

/**
 * Lấy danh sách tất cả brands có sẵn
 * @returns {array} - Danh sách brands với thông tin
 */
function getAllAvailableBrands() {
    return Object.entries(brandKeywords).map(([name, data]) => ({
        name,
        category: data.category,
        icon: data.icon,
        keywords: data.keywords
    }));
}

/**
 * Lấy danh sách tất cả categories có sẵn
 * @returns {array} - Danh sách categories
 */
function getAllAvailableCategories() {
    return Object.entries(categories).map(([name, data]) => ({
        name,
        icon: data.icon,
        color: data.color
    }));
}

/**
 * Lấy thông tin category
 * @param {string} categoryName - Tên category
 * @returns {object|null} - Thông tin category
 */
function getCategoryInfo(categoryName) {
    return categories[categoryName] || null;
}

/**
 * Lấy icon cho brand
 * @param {string} brandName - Tên brand
 * @returns {string} - Icon emoji
 */
function getBrandIcon(brandName) {
    return brandKeywords[brandName]?.icon || '📋';
}

module.exports = {
    detectBrand,
    detectBrandFromPayment,
    getAllAvailableBrands,
    getAllAvailableCategories,
    getCategoryInfo,
    getBrandIcon
};
