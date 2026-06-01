let currentCategory = 'tv';
let currentSource = 'digikala';
let currentData = [];
let currentPage = 1;
let rowsPerPage = 20;
let sortCol = null;
let sortDir = 'asc';
let charts = {};

// عناصر DOM
const fabButton = document.getElementById('fabButton');
const menuCard = document.getElementById('menuCard');
const closeMenu = document.getElementById('closeMenu');
const menuItems = document.querySelectorAll('.menu-item');
const categoryTitle = document.getElementById('category-title');
const lastUpdateSpan = document.getElementById('last-update');
const statCardsContainer = document.getElementById('stat-cards-container');
const sourceTabs = document.getElementById('source-tabs');
const filtersContainer = document.getElementById('filters-container');
const searchInput = document.getElementById('search-input');
const clearFiltersBtn = document.getElementById('clear-filters');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const paginationDiv = document.getElementById('pagination');
const productCountSpan = document.getElementById('product-count');
const chartsContainer = document.getElementById('charts-container');

// توابع کمکی
function toPersianDigits(num) {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString('fa-IR');
}

function showLoading() {
    tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-5">
        <div class="loading-spinner"><div class="spinner"></div></div>
        <p class="mt-3 text-muted">در حال بارگذاری داده‌ها...</p>
    </td></tr>`;
}

function showError(message) {
    tableBody.innerHTML = `<tr><td colspan="10" class="text-center p-5 text-danger">
        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
        <p>${message}</p>
    </td></tr>`;
}

// مدیریت منوی شناور
fabButton.addEventListener('click', () => {
    menuCard.classList.toggle('show');
    fabButton.classList.toggle('active');
});

closeMenu.addEventListener('click', () => {
    menuCard.classList.remove('show');
    fabButton.classList.remove('active');
});

// کلیک روی آیتم‌های منو
document.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item');
    if (!menuItem) return;
    const category = menuItem.dataset.category;
    if (!category) return;

    menuItems.forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');

    loadCategory(category);

    // بستن منو بعد از انتخاب
    menuCard.classList.remove('show');
    fabButton.classList.remove('active');
});

// بارگذاری دسته‌بندی
async function loadCategory(category) {
    currentCategory = category;
    currentSource = 'digikala';
    currentPage = 1;
    sortCol = null;
    sortDir = 'asc';

    categoryTitle.textContent = categories[category].name;

    renderStatCards();
    renderSourceTabs();
    renderFilters();
    renderTableHeader();

    showLoading();
    await loadDataForCurrentSource();
}

// رندر کارت‌های آمار
function renderStatCards() {
    statCardsContainer.innerHTML = `
        <div class="col-lg-3 col-md-6"><div class="stat-card blue"><i class="fas fa-chart-line fa-2x"></i><div class="stat-value" id="avg-price">۰ تومان</div><div class="stat-label">میانگین قیمت</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card green"><i class="fas fa-tv fa-2x"></i><div class="stat-value" id="total-items">۰</div><div class="stat-label">تعداد محصولات</div></div></div>
        <div class="col-lg-3 col-md-6" id="sellers-stat-wrapper"><div class="stat-card orange"><i class="fas fa-store fa-2x"></i><div class="stat-value" id="total-sellers">۰</div><div class="stat-label">تعداد فروشندگان</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card purple"><i class="fas fa-tags fa-2x"></i><div class="stat-value" id="total-brands">۰</div><div class="stat-label">تعداد برندها</div></div></div>
    `;
}

// رندر تب‌های منابع
function renderSourceTabs() {
    const sources = categories[currentCategory].sources;
    let html = '';
    for (let [key, src] of Object.entries(sources)) {
        html += `<div class="tab ${key === currentSource ? 'active' : ''}" data-source="${key}">
            <img src="${src.icon}" alt="${src.label}"> ${src.label}
        </div>`;
    }
    sourceTabs.innerHTML = html;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSource = tab.dataset.source;
            currentPage = 1;
            sortCol = null;
            sortDir = 'asc';
            showLoading();
            loadDataForCurrentSource();
        });
    });
}

// رندر فیلترها
function renderFilters() {
    const filters = categories[currentCategory].filters || [];
    let html = '';
    filters.forEach(filter => {
        if (filter.type === 'range') {
            html += `
                <div class="col-md-3 mb-3">
                    <label class="form-label">${filter.label}</label>
                    <input type="range" class="form-range" id="filter-${filter.field}" min="${filter.min}" max="${filter.max}" step="${filter.step}" value="0">
                    <div class="mt-2 text-muted"><span id="filter-value-${filter.field}">۰ تومان</span></div>
                </div>
            `;
        } else if (filter.type === 'select') {
            let optionsHtml = '<option value="">همه</option>';
            if (filter.options !== 'dynamic') {
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
    filtersContainer.innerHTML = html;

    filters.forEach(filter => {
        const el = document.getElementById(`filter-${filter.field}`);
        if (el) {
            el.addEventListener('input', applyFilters);
            el.addEventListener('change', applyFilters);
        }
    });

    const priceFilter = document.getElementById('filter-price');
    const priceValue = document.getElementById('filter-value-price');
    if (priceFilter && priceValue) {
        priceFilter.addEventListener('input', function() {
            priceValue.textContent = toPersianDigits(this.value) + ' تومان';
        });
    }
}

// به‌روزرسانی فیلترهای داینامیک
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

// رندر هدر جدول
function renderTableHeader() {
    const sourceConfig = categories[currentCategory].sources[currentSource];
    const columns = sourceConfig.columns;
    let html = '<tr>';
    columns.forEach(col => {
        html += `<th data-col="${col.field}" ${col.sortable ? 'style="cursor:pointer;"' : ''}>${col.label}</th>`;
    });
    html += '</tr>';
    tableHeader.innerHTML = html;

    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.col;
            if (sortCol === field) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortCol = field;
                sortDir = 'asc';
            }
            applyFilters();
        });
    });
}

// بارگذاری داده از GitHub (با استفاده از raw.githubusercontent)
async function loadDataForCurrentSource() {
    const categoryConfig = categories[currentCategory];
    const folder = categoryConfig.folder;
    const source = currentSource;
    const filePattern = new RegExp(`^${source}-\\d{4}-\\d{2}-\\d{2}\\.json$`);

    try {
        // دریافت لیست فایل‌ها از GitHub API
        const response = await fetch(`https://api.github.com/repos/irmosaka/price-dashboard/contents/data/${folder}`);
        if (!response.ok) throw new Error(`خطا در دریافت لیست فایل‌ها: ${response.status}`);
        const files = await response.json();

        const validFiles = files
            .filter(f => filePattern.test(f.name))
            .map(f => {
                const dateStr = f.name.match(/\d{4}-\d{2}-\d{2}/)[0];
                return { name: f.name, date: new Date(dateStr), url: f.download_url, path: f.path };
            })
            .sort((a, b) => b.date - a.date);

        if (validFiles.length === 0) {
            throw new Error(`هیچ فایل معتبری برای ${source} در پوشه ${folder} یافت نشد`);
        }

        const latestFile = validFiles[0];
        // دانلود مستقیم فایل از raw.githubusercontent.com
        const rawUrl = `https://raw.githubusercontent.com/irmosaka/price-dashboard/main/data/${folder}/${latestFile.name}`;
        const fileResponse = await fetch(rawUrl);
        if (!fileResponse.ok) throw new Error('خطا در دانلود فایل');
        const rawData = await fileResponse.json();

        const parser = categoryConfig.sources[source].parser;
        const processed = rawData.map(parser).filter(item => item.price > 0);

        currentData = processed;
        updateUI();

        // دریافت تاریخ آخرین کامیت (اختیاری)
        try {
            const commitResponse = await fetch(`https://api.github.com/repos/irmosaka/price-dashboard/commits?path=${latestFile.path}&page=1&per_page=1`);
            const commits = await commitResponse.json();
            if (commits && commits[0] && commits[0].commit.committer.date) {
                lastUpdateSpan.textContent = new Date(commits[0].commit.committer.date).toLocaleString('fa-IR');
            } else {
                lastUpdateSpan.textContent = new Date().toLocaleString('fa-IR');
            }
        } catch (e) {
            lastUpdateSpan.textContent = new Date().toLocaleString('fa-IR');
        }

    } catch (error) {
        console.error(error);
        showError(error.message || 'خطا در بارگذاری داده‌ها');
    }
}

// به‌روزرسانی آمار
function updateStats(data) {
    const prices = data.map(item => item.price).filter(p => p > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    document.getElementById('avg-price').textContent = toPersianDigits(avgPrice) + ' تومان';
    document.getElementById('total-items').textContent = toPersianDigits(data.length);
    const totalSellers = data.reduce((sum, item) => sum + (item.sellers || 0), 0);
    document.getElementById('total-sellers').textContent = toPersianDigits(totalSellers);
    const brands = [...new Set(data.map(item => item.brand).filter(b => b && b !== 'متفرقه'))];
    document.getElementById('total-brands').textContent = toPersianDigits(brands.length);
    productCountSpan.textContent = data.length;

    const sellersWrapper = document.getElementById('sellers-stat-wrapper');
    if (currentSource === 'digikala' || totalSellers === 0) {
        sellersWrapper.style.display = 'none';
    } else {
        sellersWrapper.style.display = 'block';
    }
}

// اعمال فیلترها و جستجو
function getFilteredData() {
    let filtered = currentData;
    const searchTerm = searchInput?.value.trim().toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(item => 
            (item.name && item.name.toLowerCase().includes(searchTerm)) || 
            (item.brand && item.brand.toLowerCase().includes(searchTerm))
        );
    }

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

// مرتب‌سازی
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
    tableBody.innerHTML = tbodyHtml;

    const totalPages = Math.ceil(sorted.length / rowsPerPage);
    renderPagination(totalPages, page);
}

// صفحه‌بندی
function renderPagination(totalPages, current) {
    paginationDiv.innerHTML = '';
    const maxVisible = 5;
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
        const first = document.createElement('button');
        first.textContent = '۱';
        first.onclick = () => changePage(1);
        paginationDiv.appendChild(first);
        if (start > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationDiv.appendChild(ellipsis);
        }
    }

    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.textContent = toPersianDigits(i);
        btn.className = i === current ? 'active' : '';
        btn.onclick = () => changePage(i);
        paginationDiv.appendChild(btn);
    }

    if (end < totalPages) {
        if (end < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'pagination-ellipsis';
            paginationDiv.appendChild(ellipsis);
        }
        const last = document.createElement('button');
        last.textContent = toPersianDigits(totalPages);
        last.onclick = () => changePage(totalPages);
        paginationDiv.appendChild(last);
    }
}

// رندر نمودارها
function renderCharts(data) {
    const chartConfigs = categories[currentCategory].charts || [];
    if (chartConfigs.length === 0) {
        chartsContainer.innerHTML = '<p class="text-center text-muted">نموداری برای این دسته‌بندی تعریف نشده است</p>';
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
    chartsContainer.innerHTML = html;

    chartConfigs.forEach((cfg, index) => {
        const canvas = document.getElementById(`chart-${index}`);
        if (!canvas) return;
        if (charts[index]) charts[index].destroy();

        let labels = [], values = [];

        if (cfg.type === 'bar') {
            const groups = {};
            data.forEach(item => {
                const key = item[cfg.groupBy];
                if (!key || key === 'نامشخص' || key === 'متفرقه') return;
                if (!groups[key]) groups[key] = { sum: 0, count: 0 };
                groups[key].sum += item[cfg.value] || 0;
                groups[key].count++;
            });

            if (cfg.aggregate === 'avg') {
                labels = Object.keys(groups);
                values = labels.map(k => Math.round(groups[k].sum / groups[k].count));
            } else if (cfg.aggregate === 'count') {
                labels = Object.keys(groups);
                values = labels.map(k => groups[k].count);
            }

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
                        backgroundColor: '#4361ee',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => toPersianDigits(ctx.raw) } } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => toPersianDigits(v) } } }
                }
            });
        }
    });
}

// به‌روزرسانی کامل UI
function updateUI() {
    const filtered = getFilteredData();
    updateStats(filtered);
    updateDynamicFilterOptions(filtered);
    renderTable(filtered, currentPage);
    renderCharts(filtered);
}

function applyFilters() {
    currentPage = 1;
    updateUI();
}

function changePage(page) {
    currentPage = page;
    const filtered = getFilteredData();
    renderTable(filtered, page);
}

clearFiltersBtn.addEventListener('click', () => {
    const filters = categories[currentCategory].filters || [];
    filters.forEach(filter => {
        const el = document.getElementById(`filter-${filter.field}`);
        if (el) {
            if (filter.type === 'range') el.value = 0;
            else if (filter.type === 'select') el.value = '';
        }
    });
    searchInput.value = '';
    const priceValue = document.getElementById('filter-value-price');
    if (priceValue) priceValue.textContent = '۰ تومان';
    applyFilters();
});

// مقداردهی اولیه
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = 'Vazir';
    }
    loadCategory('tv');
});
