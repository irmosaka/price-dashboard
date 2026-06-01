// config.js
const categories = {
    tv: {
        name: 'تلویزیون',
        folder: 'tv',
        sources: {
            digikala: {
                label: 'دیجی‌کالا',
                icon: 'https://www.digikala.com/statics/img/png/footerlogo2.webp',
                parser: (raw) => ({
                    name: raw['ellipsis-2'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ellipsis-2'] || ''),
                    size: extractSizeFromTitle(raw['ellipsis-2'] || ''),
                    tech: extractTechFromTitle(raw['ellipsis-2'] || ''),
                    price: toEnglishNumber(raw['flex']),
                    originalPrice: toEnglishNumber(raw['text-neutral-300']) || toEnglishNumber(raw['flex']),
                    discount: raw['text-body2-strong (2)'] || '—',
                    rating: raw['text-body2-strong'] || '—',
                    stock: raw['text-caption'] || 'نامشخص',
                    link: raw['block href'] || '#',
                    sellers: /موجود|باقی مانده/i.test(raw['text-caption'] || '') ? 1 : 0
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'قیمت اصلی', field: 'originalPrice', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'تخفیف', field: 'discount' },
                    { label: 'امتیاز', field: 'rating' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            },
            torob: {
                label: 'ترب',
                icon: 'images/torob-logo.png',
                parser: (raw) => ({
                    name: raw['ProductCard_desktop_product-name__JwqeK'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ProductCard_desktop_product-name__JwqeK'] || ''),
                    // برای ترب، قیمت از فیلد قیمت اصلی گرفته می‌شود
                    price: toEnglishNumber(raw['ProductCard_desktop_product-price-text__y20OV']),
                    // موجودی: در صورت وجود فیلد وضعیت، از آن استفاده کنید، در غیر این صورت مقدار پیش‌فرض "موجود"
                    stock: raw['ProductCard_desktop_availability'] || 'موجود',
                    link: raw['ProductCards_cards__MYvdn href'] || '#'
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            }
        },
        filters: [
            { type: 'range', label: 'حداقل قیمت', field: 'price', min: 0, max: 50000000, step: 100000 },
            { type: 'select', label: 'سایز', field: 'size', options: 'dynamic' },
            { type: 'select', label: 'برند', field: 'brand', options: 'dynamic' },
            { type: 'select', label: 'تکنولوژی', field: 'tech', options: ['LED', 'OLED', 'QLED'] }
        ],
        charts: [
            { type: 'bar', title: 'میانگین قیمت برندها', groupBy: 'brand', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'میانگین قیمت بر اساس سایز', groupBy: 'size', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'تعداد محصولات هر برند', groupBy: 'brand', value: 'count' }
        ]
    },
    fridge: {
        name: 'یخچال',
        folder: 'fridge',
        sources: {
            digikala: {
                label: 'دیجی‌کالا',
                icon: 'https://www.digikala.com/statics/img/png/footerlogo2.webp',
                parser: (raw) => ({
                    name: raw['ellipsis-2'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ellipsis-2'] || ''),
                    price: toEnglishNumber(raw['flex']),
                    originalPrice: toEnglishNumber(raw['text-neutral-300']) || toEnglishNumber(raw['flex']),
                    discount: raw['text-body2-strong (2)'] || '—',
                    rating: raw['text-body2-strong'] || '—',
                    stock: raw['text-caption'] || 'نامشخص',
                    link: raw['block href'] || '#',
                    sellers: /موجود|باقی مانده/i.test(raw['text-caption'] || '') ? 1 : 0,
                    subtype: extractFridgeSubtype(raw['ellipsis-2'] || '')
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'زیرمجموعه', field: 'subtype', sortable: true },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'قیمت اصلی', field: 'originalPrice', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'تخفیف', field: 'discount' },
                    { label: 'امتیاز', field: 'rating' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            },
            torob: {
                label: 'ترب',
                icon: 'images/torob-logo.png',
                parser: (raw) => ({
                    name: raw['ProductCard_desktop_product-name__JwqeK'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ProductCard_desktop_product-name__JwqeK'] || ''),
                    price: toEnglishNumber(raw['ProductCard_desktop_product-price-text__y20OV']),
                    stock: 'موجود', // برای ترب، مقدار پیش‌فرض
                    link: raw['ProductCards_cards__MYvdn href'] || '#',
                    subtype: extractFridgeSubtype(raw['ProductCard_desktop_product-name__JwqeK'] || '')
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'زیرمجموعه', field: 'subtype', sortable: true },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            }
        },
        filters: [
            { type: 'range', label: 'حداقل قیمت', field: 'price', min: 0, max: 50000000, step: 100000 },
            { type: 'select', label: 'سایز', field: 'size', options: 'dynamic' },
            { type: 'select', label: 'برند', field: 'brand', options: 'dynamic' },
            { type: 'select', label: 'زیرمجموعه', field: 'subtype', options: ['SBS', 'TWIN', 'BMF', 'TMF', 'French Door'] }
        ],
        charts: [
            { type: 'bar', title: 'میانگین قیمت برندها', groupBy: 'brand', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'میانگین قیمت بر اساس سایز', groupBy: 'size', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'تعداد محصولات هر برند', groupBy: 'brand', value: 'count' }
        ]
    },
    wm: {
        name: 'لباسشویی',
        folder: 'wm',
        sources: {
            digikala: {
                label: 'دیجی‌کالا',
                icon: 'https://www.digikala.com/statics/img/png/footerlogo2.webp',
                parser: (raw) => ({
                    name: raw['ellipsis-2'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ellipsis-2'] || ''),
                    price: toEnglishNumber(raw['flex']),
                    originalPrice: toEnglishNumber(raw['text-neutral-300']) || toEnglishNumber(raw['flex']),
                    discount: raw['text-body2-strong (2)'] || '—',
                    rating: raw['text-body2-strong'] || '—',
                    stock: raw['text-caption'] || 'نامشخص',
                    link: raw['block href'] || '#',
                    sellers: /موجود|باقی مانده/i.test(raw['text-caption'] || '') ? 1 : 0
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'قیمت اصلی', field: 'originalPrice', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'تخفیف', field: 'discount' },
                    { label: 'امتیاز', field: 'rating' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            },
            torob: {
                label: 'ترب',
                icon: 'images/torob-logo.png',
                parser: (raw) => ({
                    name: raw['ProductCard_desktop_product-name__JwqeK'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ProductCard_desktop_product-name__JwqeK'] || ''),
                    price: toEnglishNumber(raw['ProductCard_desktop_product-price-text__y20OV']),
                    stock: 'موجود',
                    link: raw['ProductCards_cards__MYvdn href'] || '#'
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            }
        },
        filters: [
            { type: 'range', label: 'حداقل قیمت', field: 'price', min: 0, max: 50000000, step: 100000 },
            { type: 'select', label: 'برند', field: 'brand', options: 'dynamic' }
        ],
        charts: [
            { type: 'bar', title: 'میانگین قیمت برندها', groupBy: 'brand', value: 'price', aggregate: 'avg' }
        ]
    }
};

// ========== توابع کمکی (بدون تغییر) ==========
function toPersianDigits(num) {
    if (num === undefined || num === null || isNaN(num)) return '۰';
    return num.toLocaleString('fa-IR');
}

function toEnglishNumber(str) {
    if (!str) return 0;
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let converted = str.toString();
    for (let i = 0; i < persianDigits.length; i++) {
        converted = converted.replace(new RegExp(persianDigits[i], 'g'), i);
    }
    const num = parseInt(converted.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

function normalizeText(text) {
    if (!text) return '';
    return text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function extractBrandFromTitle(title) {
    if (!title) return 'متفرقه';
    const normalized = normalizeText(title).toLowerCase();
    const brandList = [
        'سامسونگ', 'ال‌جی', 'اسنوا', 'دوو', 'هایسنس', 'پاناسونیک', 'سونی',
        'ایکس ویژن', 'تی سی ال', 'جی پلاس', 'جی وی سی', 'نکسار', 'پارس',
        'بویمن', 'لیماک جنرال اینترنشنال', 'ورلد استار', 'آپلاس', 'آیوا'
    ];
    for (let b of brandList) {
        if (normalized.includes(b.toLowerCase())) return b;
    }
    return 'متفرقه';
}

function extractSizeFromTitle(title) {
    const match = title.match(/(\d{2,3})\s*اینچ/);
    return match ? match[1] : 'نامشخص';
}

function extractTechFromTitle(title) {
    const lower = title.toLowerCase();
    if (lower.includes('qled') || lower.includes('کیو ال ای دی')) return 'QLED';
    if (lower.includes('oled') || lower.includes('اولد')) return 'OLED';
    return 'LED';
}

function extractFridgeSubtype(title) {
    const subtypes = ["SBS", "TWIN", "BMF", "TMF", "French Door"];
    for (let s of subtypes) {
        if (title.toUpperCase().includes(s.toUpperCase())) return s;
    }
    return 'نامشخص';
}
