// dashboard.js (نسخه نهایی بدون تکرار توابع کمکی)
let currentCategory = 'tv';
let currentSource = 'digikala';
let currentData = [];
let currentPage = 1;
let rowsPerPage = 20;
let sortCol = 'price';
let sortDir = 'asc';
let charts = {};

// عناصر DOM (همانند قبل)
const categoryBtns = document.querySelectorAll('.category-btn');
const categoryTitle = document.getElementById('category-title');
const lastUpdateSpan = document.getElementById('last-update');
const sourceTabs = document.getElementById('source-tabs');
const searchInput = document.getElementById('search-input');
const filtersContainer = document.getElementById('filters-container');
const filterStatusDiv = document.getElementById('filter-status');
const clearFiltersBtn = document.getElementById('clear-filters');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const paginationDiv = document.getElementById('pagination');
const sellersStat = document.getElementById('total-sellers');

// تابع نمایش لودینگ و خطا (بدون تغییر)
function showLoading() {
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px;">در حال بارگذاری...<\/td><\/tr>';
}
function showError(msg) {
    if (tableBody) tableBody.innerHTML = `</td><td colspan="10" style="text-align:center; color:red;">${msg}<\/td><\/tr>`;
}

// ========== بارگذاری داده از متغیرهای سراسری ==========
function loadDataForCurrentSource() {
    let varName = '';
    if (currentCategory === 'tv') varName = 'tv';
    else if (currentCategory === 'fridge') varName = 'fridge';
    else varName = 'wm';
    if (currentSource === 'digikala') varName += 'DigikalaData';
    else varName += 'TorobData';

    const rawData = window[varName];
    if (!rawData || !Array.isArray(rawData)) {
        showError(`داده‌ای برای ${currentCategory} - ${currentSource} یافت نشد. فایل JS مربوطه را بررسی کنید.`);
        return;
    }

    // فیلتر اولیه: حذف آیتم‌های نامعتبر (بدون لینک، عنوان خالی، قیمت نامعتبر)
    const validRaw = rawData.filter(item => {
        if (!item['block href'] || !item['block href'].includes('/product/')) return false;
        const title = item['ellipsis-2'];
        if (!title || title === 'نامشخص' || title.trim() === '') return false;
        const price = toEnglishNumber(item['flex']);
        if (price <= 0) return false;
        return true;
    });

    const parser = categories[currentCategory].sources[currentSource].parser;
    const processed = validRaw.map(parser).filter(item => item.price > 0);
    if (processed.length === 0) {
        showError('هیچ محصول معتبری یافت نشد');
        return;
    }
    currentData = processed;
    lastUpdateSpan.innerText = `آخرین بروزرسانی: ${new Date().toLocaleString('fa-IR')}`;
    applyFilters();
}

// ========== بقیه توابع (دقیقاً همان کدهای قبلی، اما بدون تعریف مجدد توابع کمکی) ==========
function renderSourceTabs() {
    const sources = categories[currentCategory].sources;
    let html = '';
    for (let [key, src] of Object.entries(sources)) {
        html += `<div class="source-tab ${key === currentSource ? 'active' : ''}" data-source="${key}">
            <img src="${src.icon}" alt="${src.label}" onerror="this.style.display='none'"> ${src.label}
        </div>`;
    }
    sourceTabs.innerHTML = html;
    document.querySelectorAll('.source-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.source-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSource = tab.dataset.source;
            currentPage = 1;
            loadDataForCurrentSource();
        });
    });
}

function renderFilters() {
    const filters = categories[currentCategory].filters || [];
    let html = '';
    filters.forEach(filter => {
        if (filter.type === 'range') {
            html += `<div class="filter-group">
                        <label>${filter.label}</label>
                        <input type="range" id="filter-${filter.field}" min="${filter.min}" max="${filter.max}" step="${filter.step}" value="0">
                        <div><span id="filter-value-${filter.field}">۰ تومان</span></div>
                    </div>`;
        } else if (filter.type === 'select') {
            let optionsHtml = '<option value="">همه</option>';
            if (filter.options !== 'dynamic') {
                filter.options.forEach(opt => optionsHtml += `<option value="${opt}">${opt}</option>`);
            }
            html += `<div class="filter-group">
                        <label>${filter.label}</label>
                        <select id="filter-${filter.field}">${optionsHtml}</select>
                    </div>`;
        }
    });
    filtersContainer.innerHTML = html;
    filters.forEach(filter => {
        const el = document.getElementById(`filter-${filter.field}`);
        if (el) el.addEventListener('change', applyFilters);
    });
    const priceFilter = document.getElementById('filter-price');
    if (priceFilter) {
        priceFilter.addEventListener('input', function() {
            document.getElementById('filter-value-price').innerText = toPersianDigits(this.value) + ' تومان';
            applyFilters();
        });
    }
}

function updateDynamicFilters(data) {
    const filters = categories[currentCategory].filters || [];
    filters.forEach(filter => {
        if (filter.type === 'select' && filter.options === 'dynamic') {
            const select = document.getElementById(`filter-${filter.field}`);
            if (!select) return;
            const values = [...new Set(data.map(item => item[filter.field]).filter(v => v && v !== 'نامشخص'))];
            if (filter.field === 'size') values.sort((a,b) => parseInt(a)-parseInt(b));
            else values.sort((a,b) => a.localeCompare(b,'fa'));
            select.innerHTML = '<option value="">همه</option>' + values.map(v => `<option value="${v}">${v}</option>`).join('');
        }
    });
}

function updateFilterStatus() {
    const minPrice = parseInt(document.getElementById('filter-price')?.value) || 0;
    const size = document.getElementById('filter-size')?.value;
    const brand = document.getElementById('filter-brand')?.value;
    const tech = document.getElementById('filter-tech')?.value;
    let statusHtml = '';
    if (minPrice > 0) statusHtml += `<span class="filter-tag">💰 حداقل قیمت: ${toPersianDigits(minPrice)} تومان <i onclick="document.getElementById('filter-price').value=0; document.getElementById('filter-value-price').innerText='۰ تومان'; applyFilters();" style="cursor:pointer; margin-left:5px;">✖</i></span>`;
    if (size) statusHtml += `<span class="filter-tag">📏 سایز: ${size} اینچ <i onclick="document.getElementById('filter-size').value=''; applyFilters();" style="cursor:pointer; margin-left:5px;">✖</i></span>`;
    if (brand) statusHtml += `<span class="filter-tag">🏷️ برند: ${brand} <i onclick="document.getElementById('filter-brand').value=''; applyFilters();" style="cursor:pointer; margin-left:5px;">✖</i></span>`;
    if (tech) statusHtml += `<span class="filter-tag">⚡ تکنولوژی: ${tech} <i onclick="document.getElementById('filter-tech').value=''; applyFilters();" style="cursor:pointer; margin-left:5px;">✖</i></span>`;
    if (searchInput.value.trim()) statusHtml += `<span class="filter-tag">🔍 جستجو: "${searchInput.value}" <i onclick="searchInput.value=''; applyFilters();" style="cursor:pointer; margin-left:5px;">✖</i></span>`;
    filterStatusDiv.innerHTML = statusHtml || '<span class="text-muted">هیچ فیلتری فعال نیست</span>';
}

function renderTableHeader() {
    const cols = categories[currentCategory].sources[currentSource].columns;
    let html = '<tr>';
    cols.forEach(col => html += `<th data-col="${col.field}">${col.label}</th>`);
    html += '</tr>';
    tableHeader.innerHTML = html;
    document.querySelectorAll('th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.col;
            if (sortCol === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            else { sortCol = field; sortDir = 'asc'; }
            applyFilters();
        });
    });
}

function getFilteredData() {
    if (!currentData.length) return [];
    let filtered = currentData;
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) filtered = filtered.filter(item => item.name.toLowerCase().includes(searchTerm) || item.brand.toLowerCase().includes(searchTerm));
    const minPrice = parseInt(document.getElementById('filter-price')?.value) || 0;
    if (minPrice > 0) filtered = filtered.filter(item => item.price >= minPrice);
    const selectedSize = document.getElementById('filter-size')?.value;
    if (selectedSize) filtered = filtered.filter(item => item.size === selectedSize);
    const selectedBrand = document.getElementById('filter-brand')?.value;
    if (selectedBrand) filtered = filtered.filter(item => item.brand === selectedBrand);
    const selectedTech = document.getElementById('filter-tech')?.value;
    if (selectedTech) filtered = filtered.filter(item => item.tech === selectedTech);
    return filtered;
}

function sortData(data) {
    if (!sortCol) return data;
    return [...data].sort((a,b) => {
        let aVal = a[sortCol], bVal = b[sortCol];
        if (sortCol === 'price' || sortCol === 'originalPrice' || sortCol === 'sellers') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

function updateStats(data) {
    const prices = data.map(item => item.price);
    const avgPrice = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
    document.getElementById('avg-price').innerText = toPersianDigits(avgPrice);
    document.getElementById('total-items').innerText = toPersianDigits(data.length);
    const totalSellers = data.reduce((s,item) => s + (item.sellers||0), 0);
    document.getElementById('total-sellers').innerText = toPersianDigits(totalSellers);
    const brands = [...new Set(data.map(item => item.brand).filter(b=>b!=='متفرقه'))];
    document.getElementById('total-brands').innerText = toPersianDigits(brands.length);
    if (currentSource === 'digikala') sellersStat.style.display = 'none';
    else sellersStat.style.display = 'block';
}

function renderTable(data, page = currentPage) {
    const sorted = sortData(data);
    const totalPages = Math.ceil(sorted.length / rowsPerPage);
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    const start = (page-1)*rowsPerPage;
    const pageData = sorted.slice(start, start+rowsPerPage);
    const cols = categories[currentCategory].sources[currentSource].columns;
    let tbody = '';
    pageData.forEach(item => {
        let rowClass = '';
        if (item.brand === 'اسنوا') rowClass = 'highlight-snova';
        else if (item.brand === 'دوو') rowClass = 'highlight-daww';
        let row = `<tr class="${rowClass}">`;
        cols.forEach(col => {
            let val = item[col.field];
            if (col.render) val = col.render(val);
            else if (val === undefined) val = '—';
            row += `<td>${val}</td>`;
        });
        row += '</tr>';
        tbody += row;
    });
    tableBody.innerHTML = tbody || '<tr><td colspan="10" style="text-align:center">هیچ داده‌ای یافت نشد<\/td><\/tr>';
    let paginationHtml = '';
    for (let i=1; i<=totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i===page?'active':''}" data-page="${i}">${toPersianDigits(i)}</button>`;
    }
    paginationDiv.innerHTML = paginationHtml;
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newPage = parseInt(btn.dataset.page);
            currentPage = newPage;
            renderTable(sorted, newPage);
        });
    });
}

function renderCharts(data) {
    if (!data.length) return;
    // نمودار میانگین قیمت برندها
    const brandCanvas = document.getElementById('brand-chart');
    if (brandCanvas) {
        const brandGroups = {};
        data.forEach(item => {
            if (item.brand && item.brand !== 'متفرقه') {
                if (!brandGroups[item.brand]) brandGroups[item.brand] = [];
                brandGroups[item.brand].push(item.price);
            }
        });
        if (Object.keys(brandGroups).length > 0) {
            let brandAvg = Object.entries(brandGroups).map(([b,p]) => ({brand:b, avg:Math.round(p.reduce((a,c)=>a+c,0)/p.length)}));
            brandAvg.sort((a,b)=>b.avg - a.avg);
            const brandLabels = brandAvg.slice(0,15).map(i=>i.brand);
            const brandValues = brandAvg.slice(0,15).map(i=>i.avg);
            if (charts.brand) charts.brand.destroy();
            charts.brand = new Chart(brandCanvas, {
                type: 'bar',
                data: { labels: brandLabels, datasets: [{ data: brandValues, backgroundColor: '#4361ee', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => toPersianDigits(v) } } } }
            });
        }
    }
    // نمودار میانگین قیمت بر اساس سایز
    const sizeCanvas = document.getElementById('size-chart');
    if (sizeCanvas) {
        const sizeGroups = {};
        data.forEach(item => {
            if (item.size && item.size !== 'نامشخص') {
                if (!sizeGroups[item.size]) sizeGroups[item.size] = [];
                sizeGroups[item.size].push(item.price);
            }
        });
        if (Object.keys(sizeGroups).length > 0) {
            const sizeLabels = Object.keys(sizeGroups).slice(0,15);
            const sizeValues = sizeLabels.map(s => Math.round(sizeGroups[s].reduce((a,c)=>a+c,0)/sizeGroups[s].length));
            if (charts.size) charts.size.destroy();
            charts.size = new Chart(sizeCanvas, {
                type: 'bar',
                data: { labels: sizeLabels, datasets: [{ data: sizeValues, backgroundColor: '#a14aef', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => toPersianDigits(v) } } } }
            });
        }
    }
    // نمودار تعداد محصولات هر برند
    const countCanvas = document.getElementById('count-chart');
    if (countCanvas) {
        const brandCounts = {};
        data.forEach(item => {
            if (item.brand && item.brand !== 'متفرقه') brandCounts[item.brand] = (brandCounts[item.brand]||0)+1;
        });
        if (Object.keys(brandCounts).length > 0) {
            let brandCountArray = Object.entries(brandCounts).map(([b,c])=>({brand:b, count:c}));
            brandCountArray.sort((a,b)=>b.count - a.count);
            const countLabels = brandCountArray.slice(0,15).map(i=>i.brand);
            const countValues = brandCountArray.slice(0,15).map(i=>i.count);
            if (charts.count) charts.count.destroy();
            charts.count = new Chart(countCanvas, {
                type: 'bar',
                data: { labels: countLabels, datasets: [{ data: countValues, backgroundColor: '#ff6b6b', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => toPersianDigits(v) } } } }
            });
        }
    }
}

function applyFilters() {
    if (!currentData.length) return;
    const filtered = getFilteredData();
    const sorted = sortData(filtered);
    updateStats(sorted);
    updateDynamicFilters(sorted);
    updateFilterStatus();
    renderTable(sorted, 1);
    renderCharts(sorted);
    currentPage = 1;
}

// ========== رویدادها ==========
categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        categoryTitle.innerText = btn.innerText.trim().replace(/[📺❄️🧺]/g,'');
        currentPage = 1;
        const fridgeSubNav = document.getElementById('fridgeSubNav');
        if (fridgeSubNav) {
            if (currentCategory === 'fridge') fridgeSubNav.style.display = 'flex';
            else fridgeSubNav.style.display = 'none';
        }
        loadDataForCurrentSource();
    });
});

searchInput.addEventListener('input', () => { currentPage=1; applyFilters(); });
clearFiltersBtn.addEventListener('click', () => {
    const price = document.getElementById('filter-price');
    if (price) price.value = 0;
    const priceVal = document.getElementById('filter-value-price');
    if (priceVal) priceVal.innerText = '۰ تومان';
    const size = document.getElementById('filter-size');
    if (size) size.value = '';
    const brand = document.getElementById('filter-brand');
    if (brand) brand.value = '';
    const tech = document.getElementById('filter-tech');
    if (tech) tech.value = '';
    searchInput.value = '';
    applyFilters();
});

// ========== شروع ==========
document.addEventListener('DOMContentLoaded', () => {
    renderSourceTabs();
    renderFilters();
    renderTableHeader();
    loadDataForCurrentSource();
});