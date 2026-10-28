const channel = new BroadcastChannel('delivery_system_channel');

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderDashboard();
});

channel.onmessage = () => renderDashboard();

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function handleCreateAccount(e) {
    e.preventDefault();
    const role = document.getElementById('accRole').value;
    const name = document.getElementById('accName').value.trim();
    const email = document.getElementById('accEmail').value.trim();
    const password = document.getElementById('accPassword').value.trim();

    const users = JSON.parse(localStorage.getItem('app_users') || '[]');
    if (users.find(u => u.email === email)) {
        alert('هذا الحساب مسجل مسبقاً!');
        return;
    }

    users.push({ id: 'U-' + Date.now(), role, name, email, password });
    localStorage.setItem('app_users', JSON.stringify(users));
    channel.postMessage({ type: 'USERS_UPDATED' });
    alert('تم إنشاء الحساب بنجاح!');
    e.target.reset();
    renderDashboard();
}

function deleteUser(id) {
    if (confirm('حذف هذا الحساب؟')) {
        let users = JSON.parse(localStorage.getItem('app_users') || '[]');
        users = users.filter(u => u.id !== id);
        localStorage.setItem('app_users', JSON.stringify(users));
        channel.postMessage({ type: 'USERS_UPDATED' });
        renderDashboard();
    }
}

function renderDashboard() {
    const users = JSON.parse(localStorage.getItem('app_users') || '[]');
    const delivered = JSON.parse(localStorage.getItem('delivered_history') || '[]');

    const rests = users.filter(u => u.role === 'restaurant');
    const caps = users.filter(u => u.role === 'captain');

    document.getElementById('statRestCount').innerText = rests.length;
    document.getElementById('statCapCount').innerText = caps.length;
    document.getElementById('statDeliveredCount').innerText = delivered.length;

    // جدول المستخدمين والحالة (متصل / عطلة)
    document.getElementById('usersTableBody').innerHTML = users.map(u => {
        let statusBadge = '-';
        if (u.role === 'captain') {
            const st = localStorage.getItem(`captain_status_${u.email}`) || 'متصل';
            if (st === 'متصل') {
                statusBadge = `<span class="status-badge-online"><i class="fa-solid fa-circle" style="font-size:8px;"></i> متصل (شغال)</span>`;
            } else {
                statusBadge = `<span class="status-badge-offline"><i class="fa-solid fa-circle" style="font-size:8px;"></i> عطلة</span>`;
            }
        } else {
            statusBadge = `<span style="color:var(--text-muted);">مطعم معتمد</span>`;
        }

        return `
            <tr>
                <td>${u.role === 'restaurant' ? 'مطعم 🍔' : 'كابتن 🏍️'}</td>
                <td><strong>${u.name}</strong></td>
                <td>${statusBadge}</td>
                <td><button class="btn btn-danger" onclick="deleteUser('${u.id}')">حذف</button></td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">لا توجد حسابات مضافة</td></tr>`;

    // تقارير الأداء
    const perfBody = document.getElementById('performanceTableBody');
    let perfHtml = '';
    
    rests.forEach(r => {
        const rOrders = delivered.filter(d => d.restEmail === r.email);
        const totalSales = rOrders.reduce((sum, o) => sum + (o.foodPrice || 0), 0);
        perfHtml += `
            <tr>
                <td><strong>${r.name}</strong></td>
                <td>مطعم 🍔</td>
                <td>${rOrders.length} طلبات</td>
                <td style="color:var(--primary); font-weight:700;">${totalSales} ج.م (مبيعات طعام)</td>
            </tr>
        `;
    });

    caps.forEach(c => {
        const cOrders = delivered.filter(d => d.captainEmail === c.email);
        const totalEarn = cOrders.reduce((sum, o) => sum + (o.deliveryPrice || 0), 0);
        perfHtml += `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>كابتن 🏍️</td>
                <td>${cOrders.length} توصيلات</td>
                <td style="color:var(--secondary); font-weight:700;">${totalEarn} ج.م (أجر توصيل)</td>
            </tr>
        `;
    });

    perfBody.innerHTML = perfHtml || `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">لا توجد بيانات أداء حتى الآن</td></tr>`;
}