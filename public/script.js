// Global state
let allPayments = [];
let editingPaymentId = null;

// DOM elements
const addPaymentForm = document.getElementById('addPaymentForm');
const editPaymentForm = document.getElementById('editPaymentForm');
const editModal = document.getElementById('editModal');
const allPaymentsContainer = document.getElementById('allPayments');
const upcomingPaymentsContainer = document.getElementById('upcomingPayments');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkStatus();
    loadPayments();
    setupEventListeners();

    // Set minimum date for date inputs to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('due_date').setAttribute('min', today);
    document.getElementById('edit_due_date').setAttribute('min', today);
});

// Setup event listeners
function setupEventListeners() {
    // Add payment form
    addPaymentForm.addEventListener('submit', handleAddPayment);

    // Edit payment form
    editPaymentForm.addEventListener('submit', handleEditPayment);

    // Modal controls
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.querySelector('.cancel-btn').addEventListener('click', closeModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
    });

    // Header buttons
    document.getElementById('syncGoogleBtn').addEventListener('click', handleGoogleAuth);
    document.getElementById('testTelegramBtn').addEventListener('click', testTelegram);
    document.getElementById('refreshBtn').addEventListener('click', loadPayments);
    document.getElementById('sendSummaryBtn').addEventListener('click', sendSummary);
    document.getElementById('manualCheckBtn').addEventListener('click', manualCheck);
}

// API calls
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Lỗi kết nối đến server', 'error');
        throw error;
    }
}

// Check system status
async function checkStatus() {
    try {
        // Check Google Calendar status
        const googleStatus = await apiCall('/api/google/status');
        updateGoogleStatus(googleStatus.authorized);

        // Check Telegram status
        const telegramStatus = await apiCall('/api/telegram/status');
        updateTelegramStatus(telegramStatus.enabled);

        // Check scheduler status
        const schedulerStatus = await apiCall('/api/notifications/status');
        updateSchedulerStatus(schedulerStatus.data);
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

// Update status displays
function updateGoogleStatus(authorized) {
    const statusEl = document.getElementById('gcalStatus');
    const btnEl = document.getElementById('googleStatus');

    if (authorized) {
        statusEl.textContent = '✓ Đã kết nối';
        statusEl.className = 'status-value connected';
        btnEl.textContent = 'Đã kết nối';
    } else {
        statusEl.textContent = '✗ Chưa kết nối';
        statusEl.className = 'status-value disconnected';
        btnEl.textContent = 'Kết nối Google Calendar';
    }
}

function updateTelegramStatus(enabled) {
    const statusEl = document.getElementById('telegramStatus');

    if (enabled) {
        statusEl.textContent = '✓ Đã kích hoạt';
        statusEl.className = 'status-value connected';
    } else {
        statusEl.textContent = '✗ Chưa cấu hình';
        statusEl.className = 'status-value disconnected';
    }
}

function updateSchedulerStatus(status) {
    const statusEl = document.getElementById('schedulerStatus');

    if (status.isRunning) {
        statusEl.textContent = `✓ Đang chạy (${status.daysAhead} ngày)`;
        statusEl.className = 'status-value connected';
    } else {
        statusEl.textContent = '✗ Đã dừng';
        statusEl.className = 'status-value disconnected';
    }
}

// Google Calendar authentication
async function handleGoogleAuth() {
    try {
        const result = await apiCall('/auth/google');

        if (result.authorized) {
            showToast('Google Calendar đã được kết nối', 'success');
        } else if (result.authUrl) {
            // Open authorization URL in new window
            window.open(result.authUrl, '_blank', 'width=600,height=600');
            showToast('Vui lòng hoàn tất xác thực trong cửa sổ mới', 'info');

            // Check status after a few seconds
            setTimeout(() => {
                checkStatus();
            }, 5000);
        }
    } catch (error) {
        showToast('Lỗi khi kết nối Google Calendar', 'error');
    }
}

// Test Telegram
async function testTelegram() {
    try {
        showToast('Đang gửi tin nhắn test...', 'info');
        const result = await apiCall('/api/telegram/test');

        if (result.success) {
            showToast('Telegram đã gửi tin nhắn test thành công!', 'success');
        } else {
            showToast(`Lỗi Telegram: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi test Telegram', 'error');
    }
}

// Load all payments
async function loadPayments() {
    try {
        const result = await apiCall('/api/payments');

        if (result.success) {
            allPayments = result.data;
            renderAllPayments();
            renderUpcomingPayments();
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Render all payments
function renderAllPayments() {
    if (allPayments.length === 0) {
        allPaymentsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">Chưa có khoản thanh toán nào</div>
                <div class="empty-state-description">Thêm khoản thanh toán đầu tiên của bạn bằng form ở trên</div>
            </div>
        `;
        return;
    }

    // Sort by due date
    const sorted = [...allPayments].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    allPaymentsContainer.innerHTML = sorted.map(payment => renderPaymentItem(payment)).join('');
}

// Render upcoming payments (within 7 days)
function renderUpcomingPayments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcoming = allPayments.filter(payment => {
        if (payment.status === 'paid') return false;

        const dueDate = new Date(payment.due_date);
        dueDate.setHours(0, 0, 0, 0);

        return dueDate >= today && dueDate <= sevenDaysFromNow;
    });

    if (upcoming.length === 0) {
        upcomingPaymentsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-text">Không có khoản thanh toán sắp đến hạn</div>
                <div class="empty-state-description">7 ngày tới không có khoản thanh toán nào</div>
            </div>
        `;
        return;
    }

    upcomingPaymentsContainer.innerHTML = upcoming.map(payment => renderPaymentItem(payment, true)).join('');
}

// Render individual payment item
function renderPaymentItem(payment, isUpcoming = false) {
    const daysLeft = calculateDaysLeft(payment.due_date);
    const isPaid = payment.status === 'paid';

    let urgencyClass = '';
    let urgencyBadge = '';

    if (!isPaid) {
        if (daysLeft < 0) {
            urgencyClass = 'urgent';
            urgencyBadge = `<span class="badge badge-urgent">🚨 Quá hạn ${Math.abs(daysLeft)} ngày</span>`;
        } else if (daysLeft === 0) {
            urgencyClass = 'urgent';
            urgencyBadge = `<span class="badge badge-urgent">🚨 Hôm nay</span>`;
        } else if (daysLeft === 1) {
            urgencyClass = 'warning';
            urgencyBadge = `<span class="badge badge-warning">⚠️ Ngày mai</span>`;
        } else if (daysLeft <= 3) {
            urgencyClass = 'warning';
            urgencyBadge = `<span class="badge badge-warning">⚠️ ${daysLeft} ngày</span>`;
        } else {
            urgencyBadge = `<span class="badge badge-pending">📅 ${daysLeft} ngày</span>`;
        }
    } else {
        urgencyClass = 'paid';
        urgencyBadge = `<span class="badge badge-paid">✅ Đã thanh toán</span>`;
    }

    const statusBadge = isPaid
        ? `<span class="badge badge-paid">Đã thanh toán</span>`
        : `<span class="badge badge-pending">Chưa thanh toán</span>`;

    return `
        <div class="payment-item ${urgencyClass}">
            <div class="payment-header">
                <div class="payment-title">${escapeHtml(payment.title)}</div>
                <div class="payment-badges">
                    ${urgencyBadge}
                    ${!isUpcoming ? statusBadge : ''}
                </div>
            </div>

            ${payment.description ? `
                <div class="payment-description">
                    ${escapeHtml(payment.description)}
                </div>
            ` : ''}

            <div class="payment-info">
                <div class="payment-info-item">
                    <span>💰</span>
                    <strong>${payment.amount ? formatCurrency(payment.amount) : 'Chưa xác định'}</strong>
                </div>
                <div class="payment-info-item">
                    <span>📆</span>
                    <strong>Hạn: ${formatDate(payment.due_date)}</strong>
                </div>
                ${payment.google_event_id ? `
                    <div class="payment-info-item">
                        <span>✓</span>
                        <span>Đã đồng bộ với Google Calendar</span>
                    </div>
                ` : ''}
            </div>

            <div class="payment-actions">
                ${!isPaid ? `
                    <button class="btn btn-success" onclick="markAsPaid(${payment.id})">
                        <span class="icon">✓</span>
                        Đã thanh toán
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="editPayment(${payment.id})">
                    <span class="icon">✏️</span>
                    Sửa
                </button>
                <button class="btn btn-danger" onclick="deletePayment(${payment.id}, '${escapeHtml(payment.title)}')">
                    <span class="icon">🗑️</span>
                    Xóa
                </button>
            </div>
        </div>
    `;
}

// Handle add payment
async function handleAddPayment(e) {
    e.preventDefault();

    const formData = new FormData(addPaymentForm);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        amount: formData.get('amount') ? parseFloat(formData.get('amount')) : null,
        due_date: formData.get('due_date')
    };

    try {
        const result = await apiCall('/api/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result.success) {
            showToast('✓ Đã thêm khoản thanh toán mới', 'success');
            addPaymentForm.reset();
            loadPayments();
        } else {
            showToast(`Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi thêm khoản thanh toán', 'error');
    }
}

// Edit payment
function editPayment(id) {
    const payment = allPayments.find(p => p.id === id);
    if (!payment) return;

    editingPaymentId = id;

    document.getElementById('edit_id').value = payment.id;
    document.getElementById('edit_title').value = payment.title;
    document.getElementById('edit_description').value = payment.description || '';
    document.getElementById('edit_amount').value = payment.amount || '';
    document.getElementById('edit_due_date').value = payment.due_date;
    document.getElementById('edit_status').value = payment.status;

    editModal.classList.add('show');
}

// Handle edit payment
async function handleEditPayment(e) {
    e.preventDefault();

    const formData = new FormData(editPaymentForm);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        amount: formData.get('amount') ? parseFloat(formData.get('amount')) : null,
        due_date: formData.get('due_date'),
        status: formData.get('status')
    };

    try {
        const result = await apiCall(`/api/payments/${editingPaymentId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (result.success) {
            showToast('✓ Đã cập nhật khoản thanh toán', 'success');
            closeModal();
            loadPayments();
        } else {
            showToast(`Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi cập nhật khoản thanh toán', 'error');
    }
}

// Mark as paid
async function markAsPaid(id) {
    try {
        const result = await apiCall(`/api/payments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'paid' })
        });

        if (result.success) {
            showToast('✓ Đã đánh dấu là đã thanh toán', 'success');
            loadPayments();
        } else {
            showToast(`Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi cập nhật trạng thái', 'error');
    }
}

// Delete payment
async function deletePayment(id, title) {
    if (!confirm(`Bạn có chắc muốn xóa "${title}"?`)) {
        return;
    }

    try {
        const result = await apiCall(`/api/payments/${id}`, {
            method: 'DELETE'
        });

        if (result.success) {
            showToast('✓ Đã xóa khoản thanh toán', 'success');
            loadPayments();
        } else {
            showToast(`Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi xóa khoản thanh toán', 'error');
    }
}

// Send summary report
async function sendSummary() {
    try {
        showToast('Đang gửi báo cáo...', 'info');
        const result = await apiCall('/api/notifications/summary', {
            method: 'POST'
        });

        if (result.success) {
            showToast(`✓ Đã gửi báo cáo (${result.count} khoản thanh toán)`, 'success');
        } else {
            showToast(`Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi gửi báo cáo', 'error');
    }
}

// Manual notification check
async function manualCheck() {
    try {
        showToast('Đang kiểm tra thông báo...', 'info');
        const result = await apiCall('/api/notifications/check', {
            method: 'POST'
        });

        if (result.success) {
            showToast('✓ Đã hoàn tất kiểm tra thông báo', 'success');
        } else {
            showToast(`Lỗi: ${result.message}`, 'error');
        }
    } catch (error) {
        showToast('Lỗi khi kiểm tra thông báo', 'error');
    }
}

// Close modal
function closeModal() {
    editModal.classList.remove('show');
    editingPaymentId = null;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility functions
function calculateDaysLeft(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== BRAND MANAGEMENT =====

// Load brand suggestions and categories
async function loadBrandOptions() {
    try {
        const [brandsRes, categoriesRes] = await Promise.all([
            apiCall('/api/brands/available'),
            apiCall('/api/categories/available')
        ]);

        if (brandsRes.success) {
            const datalist = document.getElementById('brandSuggestions');
            datalist.innerHTML = brandsRes.data.map(b => 
                `<option value="${b.name}">${b.icon} ${b.name} (${b.category})</option>`
            ).join('');
        }

        if (categoriesRes.success) {
            const selects = [document.getElementById('category'), document.getElementById('edit_category')];
            selects.forEach(select => {
                select.innerHTML = '<option value="">-- Tự động phát hiện --</option>' +
                    categoriesRes.data.map(c => 
                        `<option value="${c.name}">${c.icon} ${c.name}</option>`
                    ).join('');
            });
        }
    } catch (error) {
        console.error('Error loading brand options:', error);
    }
}

// Load brands for filter
async function loadBrandFilter() {
    try {
        const result = await apiCall('/api/brands');
        if (result.success && result.data.length > 0) {
            const filter = document.getElementById('brandFilter');
            filter.innerHTML = '<option value="">Tất cả thương hiệu</option>' +
                result.data.map(b => 
                    `<option value="${b.brand}">${b.brand} (${b.count})</option>`
                ).join('');
            
            filter.addEventListener('change', (e) => filterByBrand(e.target.value));
        }
    } catch (error) {
        console.error('Error loading brand filter:', error);
    }
}

// Filter payments by brand
async function filterByBrand(brand) {
    if (!brand) {
        renderPayments(allPayments);
    } else {
        const filtered = allPayments.filter(p => p.brand === brand);
        renderPayments(filtered);
    }
}

// Initialize brand features on page load
const originalDOMContentLoaded = document.addEventListener('DOMContentLoaded', () => {});
document.addEventListener('DOMContentLoaded', () => {
    loadBrandOptions();
    loadBrandFilter();
});


// ===== SETTINGS MANAGEMENT =====

// Load reminder settings
async function loadReminderSettings() {
    try {
        const result = await apiCall('/api/settings/reminders');
        if (result.success) {
            const days = result.data;
            document.getElementById('remind7days').checked = days.includes(7);
            document.getElementById('remind3days').checked = days.includes(3);
            document.getElementById('remind1day').checked = days.includes(1);
            document.getElementById('remind0days').checked = days.includes(0);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save reminder settings
async function saveReminderSettings() {
    try {
        const reminderDays = [];
        if (document.getElementById('remind7days').checked) reminderDays.push(7);
        if (document.getElementById('remind3days').checked) reminderDays.push(3);
        if (document.getElementById('remind1day').checked) reminderDays.push(1);
        if (document.getElementById('remind0days').checked) reminderDays.push(0);
        
        const result = await apiCall('/api/settings/reminders', {
            method: 'POST',
            body: JSON.stringify({ reminderDays })
        });
        
        if (result.success) {
            showToast('✅ Đã lưu cài đặt nhắc nhở!', 'success');
        }
    } catch (error) {
        showToast('❌ Lỗi khi lưu cài đặt', 'error');
    }
}

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', () => {
    loadReminderSettings();
    
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveReminderSettings);
    }
});

