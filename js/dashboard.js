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
if (fabButton) {
    fabButton.addEventListener('click', () => {
        menuCard.classList.toggle('show');
        fabButton.classList.toggle('active');
    });
}

if (closeMenu) {
    closeMenu.addEventListener('click', () => {
        menuCard.classList.remove('show');
        fabButton.classList.remove('active');
    });
}

// کلیک روی آیتم‌های منو
document.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item');
    if (!menuItem) return;
    const category = menuItem.dataset.category;
    if (!category) return;

    menuItems.forEach(item => item.classList.remove('active'));
    menuItem.classList.add('active');

    loadCategory(category);

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

    if (categoryTitle) categoryTitle.textContent = categories[category].name;

    renderStatCards();
    renderSourceTabs();
    renderFilters();
    renderTableHeader();

    showLoading();
    await loadDataForCurrentSource();
}

// رندر کارت‌های آمار
function renderStatCards() {
    if (!statCardsContainer) return;
    statCardsContainer.innerHTML = `
        <div class="col-lg-3 col-md-6"><div class="stat-card blue"><i class="fas fa-chart-line fa-2x"></i><div class="stat-value" id="avg-price">۰ تومان</div><div class="stat-label">میانگین قیمت</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card green"><i class="fas fa-tv fa-2x"></i><div class="stat-value" id="total-items">۰</div><div class="stat-label">تعداد محصولات</div></div></div>
        <div class="col-lg-3 col-md-6" id="sellers-stat-wrapper"><div class="stat-card orange"><i class="fas fa-store fa-2x"></i><div class="stat-value" id="total-sellers">۰</div><div class="stat-label">تعداد فروشندگان</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card purple"><i class="fas fa-tags fa-2x"></i><div class="stat-value" id="total-brands">۰</div><div class="stat-label">تعداد برندها</div></div></div>
    `;
}

// رندر تب‌های منابع
function renderSourceTabs() {
    if (!sourceTabs) return;
    const sources = categories[currentCategory].sources;
    let html = '';
    for (let [key, src] of Object.entries(sources)) {
        html += `<div class="tab ${key === currentSource ? 'active' : ''}" data-source="${key}">
            <img src="${src.icon}" alt="${src.label}" style="height:20px"> ${src.label}
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
    if (!filtersContainer) return;
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
        priceFilter.addEventListener('input', function () {
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
            const values = [...new Set(data.map(item => item[filter.field]).filter(v => v && v !== 'نامشخص' && v !== 'متفرقه'))];
            values.sort((a, b) => a.localeCompare(b, 'fa'));
            select.innerHTML = '<option value="">همه</option>' + values.map(v => `<option value="${v}">${v}</option>`).join('');
        }
    });
}

// رندر هدر جدول
function renderTableHeader() {
    if (!tableHeader) return;
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

// بارگذاری داده
async function loadDataForCurrentSource() {
    const categoryConfig = categories[currentCategory];
    const folder = categoryConfig.folder;
    const source = currentSource;
    const filePattern = new RegExp(`^${source}-\\d{4}-\\d{2}-\\d{2}\\.json$`);

    try {
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
        const rawUrl = `https://raw.githubusercontent.com/irmosaka/price-dashboard/main/data/${folder}/${latestFile.name}`;
        const fileResponse = await fetch(rawUrl);
        if (!fileResponse.ok) throw new Error('خطا در دانلود فایل');
        const rawData = await fileResponse.json();

        const parser = categoryConfig.sources[source].parser;

        // مهم: flatMap چون parser ممکنه آرایه برگردونه
        const processed = rawData
            .flatMap(item => {
                const result = parser(item);
                return Array.isArray(result) ? result : [result];
            })
            .filter(item => item && item.price > 0);

        currentData = processed;
        console.log('تعداد کل محصولات استخراج شده:', currentData.length);
        console.log('تعداد دوو:', currentData.filter(p => p.brand === 'دوو').length);

        updateUI();

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
    const avgEl = document.getElementById('avg-price');
    if (avgEl) avgEl.textContent = toPersianDigits(avgPrice) + ' تومان';

    const totalEl = document.getElementById('total-items');
    if (totalEl) totalEl.textContent = toPersianDigits(data.length);

    const totalSellers = data.reduce((sum, item) => sum + (item.sellers || 0), 0);
    const sellersEl = document.getElementById('total-sellers');
    if (sellersEl) sellersEl.textContent = toPersianDigits(totalSellers);

    const brands = [...new Set(data.map(item => item.brand).filter(b => b && b !== 'متفرقه'))];
    const brandsEl = document.getElementById('total-brands');
    if (brandsEl) brandsEl.textContent = toPersianDigits(brands.length);

    if (productCountSpan) productCountSpan.textContent = data.length;

    const sellersWrapper = document.getElementById('sellers-stat-wrapper');
    if (sellersWrapper) {
        if (currentSource === 'digikala' || totalSellers === 0) {
            sellersWrapper.style.display = 'none';
        } else {
            sellersWrapper.style.display = 'block';
        }
    }
}

// اعمال فیلترها
function getFilteredData() {
    let filtered = [...currentData];
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

    // مرتب‌سازی
    if (sortCol) {
        filtered.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

function applyFilters() {
    const filtered = getFilteredData();
    updateStats(filtered);
    updateDynamicFilterOptions(currentData);
    renderTable(filtered);
    renderPagination(filtered);
}

function renderTable(data) {
    if (!tableBody) return;
    const sourceConfig = categories[currentCategory].sources[currentSource];
    const columns = sourceConfig.columns;

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = data.slice(start, start + rowsPerPage);

    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${columns.length}" class="text-center p-4">محصولی یافت نشد</td></tr>`;
        return;
    }

    tableBody.innerHTML = pageData.map(item => {
        let rowClass = '';
        if (item.brand === 'اسنوا') rowClass = 'highlight-snova';
        if (item.brand === 'دوو') rowClass = 'highlight-daww';

        return `<tr class="${rowClass}">` + columns.map(col => {
            let value = item[col.field];
            if (col.render) value = col.render(value);
            return `<td>${value ?? '—'}</td>`;
        }).join('') + `</tr>`;
    }).join('');
}

function renderPagination(data) {
    if (!paginationDiv) return;
    const totalPages = Math.ceil(data.length / rowsPerPage);
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${toPersianDigits(i)}</button>`;
    }
    paginationDiv.innerHTML = html;

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            applyFilters();
        });
    });
}

function updateUI() {
    updateDynamicFilterOptions(currentData);
    applyFilters();
}

// شروع
document.addEventListener('DOMContentLoaded', () => {
    loadCategory('tv');
});
