// dashboard.js

let currentCategory = null;
let currentSource = 'digikala'; // پیش‌فرض
let currentData = [];
let currentPage = 1;
let rowsPerPage = 20;
let sortCol = null;
let sortDir = 'asc';

let charts = {};

// خواندن پارامتر category از URL
function getCategoryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'tv'; // پیش‌فرض tv
}

// تنظیم عنوان صفحه بر اساس دسته‌بندی
function setPageTitle() {
    document.getElementById('category-title').textContent = categories[currentCategory].name;
}

// ساخت تب‌های منابع داده (دیجی‌کالا، ترب)
function renderSourceTabs() {
    const container = document.getElementById('source-tabs');
    const sources = categories[currentCategory].sources;
    let html = '';
    for (let [key, src] of Object.entries(sources)) {
        html += `<div class="tab ${key === currentSource ? 'active' : ''}" data-source="${key}">
            <img src="${src.icon}" alt="${src.label}" style="height:1.2em; width:auto; margin-left:5px;"> ${src.label}
        </div>`;
    }
    container.innerHTML = html;
    document.querySelectorAll('#source-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#source-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSource = tab.dataset.source;
            currentPage = 1;
            sortCol = null;
            sortDir = 'asc';
            loadDataForCurrentSource();
        });
    });
}

// ساخت فیلترها بر اساس config
function renderFilters() {
    const container = document.getElementById('filters-container');
    const filters = categories[currentCategory].filters || [];
    let html = '';
    filters.forEach(filter => {
        if (filter.type === 'range') {
            html += `
                <div class="col-md-3 mb-3">
                    <label class="form-label">${filter.label}</label>
                    <input type="range" class="form-range" id="filter-${filter.field}" min="${filter.min}" max="${filter.max}" step="${filter.step}" value="0">
                    <div class="mt-2"><span id="filter-value-${filter.field}">۰ تومان</span></div>
                </div>
            `;
        } else if (filter.type === 'select') {
            let optionsHtml = '<option value="">همه</option>';
            if (filter.options === 'dynamic') {
                // بعداً از داده‌ها پر می‌شود
            } else {
                filter.options.forEach(opt => optionsHtml += `<option value="${opt}">${opt}</option>`);
            }
            html += `
                <div class="col-md-3 mb-3">
                    <label class="form-label">${filter.label}</label>
                    <select class="form-select" id="filter-${filter.field}">${optionsHtml}</select>
                </div>
            `;
        }
    });
    container.innerHTML = html;

    // اتصال رویدادها
    filters.forEach(filter => {
        const el = document.getElementById(`filter-${filter.field}`);
        if (el) {
            el.addEventListener('input', applyFilters);
            el.addEventListener('change', applyFilters);
        }
    });

    // نمایش مقدار فیلتر قیمت (اگر وجود داشت)
    const priceFilter = document.getElementById('filter-price');
    const priceValue = document.getElementById('filter-value-price');
    if (priceFilter && priceValue) {
        priceFilter.addEventListener('input', function() {
            priceValue.textContent = toPersianDigits(this.value) + ' تومان';
        });
    }
}

// به‌روزرسانی فیلترهای داینامیک (برند، سایز و ...) بر اساس داده‌ها
function updateDynamicFilterOptions(data) {
    const filters = categories[currentCategory].filters || [];
    filters.forEach(filter => {
        if (filter.type === 'select' && filter.options === 'dynamic') {
            const select = document.getElementById(`filter-${filter.field}`);
            if (!select) return;
            const values = [...new Set(data.map(item => item[filter.field]).filter(v => v && v !== 'نامشخص'))];
            values.sort((a, b) => a.localeCompare(b, 'fa'));
            select.innerHTML = '<option value="">همه</option>' + values.map(v => `<option value="${v}">${v}</option>`).join('');
        }
    });
}

// ساخت هدر جدول
function renderTableHeader() {
    const sourceConfig = categories[currentCategory].sources[currentSource];
    const columns = sourceConfig.columns;
    let html = '<tr>';
    columns.forEach(col => {
        html += `<th data-col="${col.field}" ${col.sortable ? 'style="cursor:pointer;"' : ''}>${col.label}</th>`;
    });
    html += '</tr>';
    document.getElementById('table-header').innerHTML = html;

    // اتصال رویداد sort
    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.col;
            if (sortCol === field) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortCol = field;
                sortDir = 'asc';
            }
            applyFilters(); // re-render with sort
        });
    });
}

// بارگذاری داده‌ها از GitHub (آخرین فایل در پوشه category/source)
async function loadDataForCurrentSource() {
    const categoryConfig = categories[currentCategory];
    const folder = categoryConfig.folder;
    const source = currentSource;
    const filePattern = `${source}-\\d{4}-\\d{2}-\\d{2}\\.json`; // regex for filename

    try {
        // دریافت لیست فایل‌های پوشه
        const response = await fetch(`https://api.github.com/repos/irmosaka/tv-price-dashboard/contents/data/${folder}`);
        if (!response.ok) throw new Error('خطا در دریافت لیست فایل‌ها');
        const files = await response.json();

        // فیلتر کردن فایل‌های مربوط به این source و استخراج تاریخ
        const validFiles = files
            .filter(f => f.name.match(new RegExp(`^${source}-\\d{4}-\\d{2}-\\d{2}\\.json$`)))
            .map(f => {
                const dateStr = f.name.match(/\d{4}-\d{2}-\d{2}/)[0];
                return { name: f.name, date: new Date(dateStr), url: f.download_url, path: f.path };
            })
            .sort((a, b) => b.date - a.date);

        if (validFiles.length === 0) throw new Error('هیچ فایلی یافت نشد');

        const latestFile = validFiles[0];
        const fileResponse = await fetch(latestFile.url);
        const rawData = await fileResponse.json();

        // اعمال parser مخصوص منبع
        const parser = categoryConfig.sources[source].parser;
        const processed = rawData.map(parser).filter(item => item.price > 0); // حذف موارد بی‌قیمت

        currentData = processed;
        updateUI();

        // بروزرسانی تاریخ آخرین کامیت
        const commitResponse = await fetch(`https://api.github.com/repos/irmosaka/tv-price-dashboard/commits?path=${latestFile.path}&page=1&per_page=1`);
        const commits = await commitResponse.json();
        if (commits && commits[0] && commits[0].commit.committer.date) {
            document.getElementById('last-update').textContent = new Date(commits[0].commit.committer.date).toLocaleString('fa-IR');
        } else {
            document.getElementById('last-update').textContent = new Date().toLocaleString('fa-IR');
        }

    } catch (error) {
        console.error(error);
        document.querySelector('#table-body').innerHTML = '<tr><td colspan="10" class="text-center p-5">خطا در بارگذاری داده‌ها</td></tr>';
    }
}

// به‌روزرسانی آمار (میانگین قیمت، تعداد محصولات و ...)
function updateStats(data) {
    // این تابع باید بر اساس categoryConfig توسعه یابد
    // فعلاً فرض می‌کنیم فیلد price همیشه وجود دارد
    const prices = data.map(item => item.price).filter(p => p > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    document.getElementById('avg-price').textContent = toPersianDigits(avgPrice) + ' تومان';
    document.getElementById('total-items').textContent = toPersianDigits(data.length);
    document.getElementById('total-brands').textContent = toPersianDigits([...new Set(data.map(item => item.brand).filter(b => b && b !== 'متفرقه'))].length);
    document.getElementById('product-count').textContent = data.length;
}

// ایجاد کارت‌های آمار (فعلاً ثابت، اما می‌توان پویا کرد)
function renderStatCards() {
    const container = document.getElementById('stat-cards-container');
    container.innerHTML = `
        <div class="col-lg-3 col-md-6"><div class="stat-card blue"><div class="stat-label">میانگین قیمت</div><div class="stat-value" id="avg-price">۰ تومان</div><i class="fas fa-chart-line"></i></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card green"><div class="stat-label">تعداد محصولات</div><div class="stat-value" id="total-items">۰</div><i class="fas fa-tv"></i></div></div>
        <div class="col-lg-3 col-md-6" id="sellers-stat-wrapper"><div class="stat-card orange"><div class="stat-label">تعداد فروشندگان</div><div class="stat-value" id="total-sellers">۰</div><i class="fas fa-store"></i></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card purple"><div class="stat-label">تعداد برندها</div><div class="stat-value" id="total-brands">۰</div><i class="fas fa-tags"></i></div></div>
    `;
    // نمایش/مخفی کردن کاشی فروشندگان بر اساس منبع
    if (currentSource === 'digikala') {
        document.getElementById('sellers-stat-wrapper').style.display = 'none';
    } else {
        document.getElementById('sellers-stat-wrapper').style.display = 'block';
    }
}

// اعمال فیلترها و جستجو
function getFilteredData() {
    let filtered = currentData;

    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(item => 
            (item.name && item.name.toLowerCase().includes(searchTerm)) || 
            (item.brand && item.brand.toLowerCase().includes(searchTerm))
        );
    }

    // اعمال فیلترهای پویا
    const filters = categories[currentCategory].filters || [];
    filters.forEach(filter => {
        const el = document.getElementById(`filter-${filter.field}`);
        if (!el) return;
        if (filter.type === 'range') {
            const minVal = parseInt(el.value) || 0;
            if (minVal > 0) {
                filtered = filtered.filter(item => (item[filter.field] || 0) >= minVal);
            }
        } else if (filter.type === 'select') {
            const selected = el.value;
            if (selected) {
                filtered = filtered.filter(item => item[filter.field] === selected);
            }
        }
    });

    return filtered;
}

// مرتب‌سازی داده‌ها
function sortData(data) {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
        let aVal = a[sortCol];
        let bVal = b[sortCol];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

// رندر جدول
function renderTable(data, page = currentPage) {
    const sorted = sortData(data);
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = sorted.slice(start, end);

    const sourceConfig = categories[currentCategory].sources[currentSource];
    const columns = sourceConfig.columns;

    let tbodyHtml = '';
    pageData.forEach(item => {
        let row = '<tr>';
        columns.forEach(col => {
            let value = item[col.field];
            if (col.render) {
                value = col.render(value);
            } else if (value === undefined || value === null) {
                value = '—';
            }
            row += `<td>${value}</td>`;
        });
        row += '</tr>';
        tbodyHtml += row;
    });

    if (tbodyHtml === '') {
        tbodyHtml = `<tr><td colspan="${columns.length}" class="text-center p-5">هیچ داده‌ای یافت نشد</td></tr>`;
    }
    document.getElementById('table-body').innerHTML = tbodyHtml;

    // صفحه‌بندی
    const totalPages = Math.ceil(sorted.length / rowsPerPage);
    renderPagination(totalPages, page);
}

// رندر صفحه‌بندی
function renderPagination(totalPages, current) {
    // مشابه کد قبلی
    // ...
}

// رندر نمودارها
function renderCharts(data) {
    const chartConfigs = categories[currentCategory].charts || [];
    const container = document.getElementById('charts-container');
    if (chartConfigs.length === 0) {
        container.innerHTML = '<p class="text-center">نموداری تعریف نشده است</p>';
        return;
    }

    let html = '';
    chartConfigs.forEach((cfg, index) => {
        html += `
            <div class="col-md-4 mb-4">
                <div class="card shadow-sm">
                    <div class="card-header bg-transparent fw-bold">${cfg.title}</div>
                    <div class="card-body" style="height: 300px;">
                        <canvas id="chart-${index}"></canvas>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    // ساخت هر نمودار
    chartConfigs.forEach((cfg, index) => {
        const canvas = document.getElementById(`chart-${index}`);
        if (!canvas) return;
        // نابود کردن نمودار قبلی
        if (charts[index]) charts[index].destroy();

        let chartData = [];
        if (cfg.type === 'bar') {
            // گروه‌بندی بر اساس groupBy
            const groups = {};
            data.forEach(item => {
                const key = item[cfg.groupBy];
                if (!key || key === 'نامشخص' || key === 'متفرقه') return;
                if (!groups[key]) groups[key] = { sum: 0, count: 0 };
                groups[key].sum += item[cfg.value] || 0;
                groups[key].count++;
            });

            let labels = [], values = [];
            if (cfg.aggregate === 'avg') {
                labels = Object.keys(groups);
                values = labels.map(k => Math.round(groups[k].sum / groups[k].count));
            } else if (cfg.aggregate === 'count') {
                labels = Object.keys(groups);
                values = labels.map(k => groups[k].count);
            }

            // محدود به 15 تا
            const combined = labels.map((l, i) => ({ label: l, value: values[i] }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 15);
            labels = combined.map(c => c.label);
            values = combined.map(c => c.value);

            charts[index] = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: cfg.title,
                        data: values,
                        backgroundColor: '#42A5F5',
                        borderColor: '#1E88E5',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { callback: v => toPersianDigits(v) } } },
                    plugins: { tooltip: { callbacks: { label: ctx => toPersianDigits(ctx.raw) } } }
                }
            });
        }
    });
}

// تابع اصلی به‌روزرسانی UI
function updateUI() {
    const filtered = getFilteredData();
    updateStats(filtered);
    updateDynamicFilterOptions(filtered);
    renderTable(filtered, currentPage);
    renderCharts(filtered);
}

// تابع اعمال فیلترها (از رویدادها صدا زده می‌شود)
function applyFilters() {
    currentPage = 1;
    updateUI();
}

// تابع تغییر صفحه
function changePage(page) {
    currentPage = page;
    const filtered = getFilteredData();
    renderTable(filtered, page);
}

// توابع کمکی
function toPersianDigits(num) {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString('fa-IR');
}

// مقداردهی اولیه
document.addEventListener('DOMContentLoaded', () => {
    currentCategory = getCategoryFromUrl();
    setPageTitle();
    renderStatCards();
    renderSourceTabs();
    renderFilters();
    renderTableHeader();
    loadDataForCurrentSource();

    // رویداد جستجو
    document.getElementById('search-input').addEventListener('input', applyFilters);

    // دکمه پاک کردن فیلترها
    document.getElementById('clear-filters').addEventListener('click', () => {
        // ریست کردن همه فیلترها
        const filters = categories[currentCategory].filters || [];
        filters.forEach(filter => {
            const el = document.getElementById(`filter-${filter.field}`);
            if (el) {
                if (filter.type === 'range') el.value = 0;
                else if (filter.type === 'select') el.value = '';
            }
        });
        document.getElementById('search-input').value = '';
        applyFilters();
    });
});
