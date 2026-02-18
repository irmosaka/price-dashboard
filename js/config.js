// config.js
const categories = {
    tv: {
        name: 'تلویزیون',
        folder: 'tv',
        sources: {
            digikala: {
                label: 'دیجی‌کالا',
                icon: 'images/digikala-logo.png',
                parser: (raw) => ({
                    name: raw['ellipsis-2'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ellipsis-2'] || ''),
                    size: extractSizeFromTitle(raw['ellipsis-2'] || ''),
                    tech: extractTechFromTitle(raw['ellipsis-2'] || ''),
                    price: parseInt((raw['flex'] || '0').replace(/[^0-9]/g, '')) || 0,
                    originalPrice: parseInt((raw['text-neutral-300'] || raw['flex'] || '0').replace(/[^0-9]/g, '')) || 0,
                    discount: raw['text-body2-strong (2)'] || '—',
                    rating: raw['text-body2-strong'] || '—',
                    stock: raw['text-caption'] || 'نامشخص',
                    link: raw['block href'] || '#'
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
                    price: parseInt((raw['ProductCard_desktop_product-price-text__y20OV'] || '0').replace(/[^0-9]/g, '')) || 0,
                    sellers: parseInt((raw['ProductCard_desktop_shops__mbtsF'] || '0').replace(/[^0-9]/g, '')) || 0,
                    link: raw['ProductCards_cards__MYvdn href'] || '#'
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'قیمت', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'تعداد فروشندگان', field: 'sellers', sortable: true, render: v => toPersianDigits(v) },
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
            { type: 'bar', title: 'میانگین قیمت برند', groupBy: 'brand', value: 'price', aggregate: 'avg' },
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
                icon: 'images/digikala-logo.png',
                parser: (raw) => ({
                    name: raw['ellipsis-2'] || 'نامشخص',
                    brand: extractBrandFromTitle(raw['ellipsis-2'] || ''),
                    capacity: extractCapacity(raw['ellipsis-2'] || ''),
                    energyRating: extractEnergyRating(raw['ellipsis-2'] || ''),
                    price: parseInt((raw['flex'] || '0').replace(/[^0-9]/g, '')) || 0,
                    originalPrice: parseInt((raw['text-neutral-300'] || raw['flex'] || '0').replace(/[^0-9]/g, '')) || 0,
                    discount: raw['text-body2-strong (2)'] || '—',
                    rating: raw['text-body2-strong'] || '—',
                    stock: raw['text-caption'] || 'نامشخص',
                    link: raw['block href'] || '#'
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'ظرفیت (لیتر)', field: 'capacity', sortable: true },
                    { label: 'رتبه انرژی', field: 'energyRating' },
                    { label: 'قیمت فروش', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'قیمت اصلی', field: 'originalPrice', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'تخفیف', field: 'discount' },
                    { label: 'امتیاز', field: 'rating' },
                    { label: 'موجودی', field: 'stock' },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            },
            torob: {
                // مشابه
            }
        },
        filters: [
            { type: 'range', label: 'حداقل قیمت', field: 'price', min: 0, max: 50000000, step: 100000 },
            { type: 'select', label: 'برند', field: 'brand', options: 'dynamic' },
            { type: 'select', label: 'ظرفیت', field: 'capacity', options: 'dynamic' },
            { type: 'select', label: 'رتبه انرژی', field: 'energyRating', options: ['A++', 'A+', 'A', 'B', 'C'] }
        ],
        charts: [
            { type: 'bar', title: 'میانگین قیمت برند', groupBy: 'brand', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'میانگین قیمت بر اساس ظرفیت', groupBy: 'capacity', value: 'price', aggregate: 'avg' }
        ]
    },
    wm: {
        name: 'لباسشویی',
        folder: 'wm',
        // مشابه ...
        // (می‌توانید بعداً تکمیل کنید)
    }
};

// توابع کمکی (می‌توانند در همین فایل یا helpers.js باشند)
function extractBrandFromTitle(title) {
    if (!title) return 'متفرقه';
    const lower = title.toLowerCase();
    const brands = ['سامسونگ', 'ال‌جی', 'اسنوا', 'دوو', 'هایسنس', 'پاناسونیک', 'سونی', 'ایکس‌ویژن', 'آیوا', 'تی‌سی‌ال', 'جی‌پلاس', 'جی‌وی‌سی', 'نکسار', 'پارس', 'بویمن', 'لیماک جنرال اینترنشنال', 'ورلد استار'];
    for (let b of brands) {
        if (lower.includes(b.toLowerCase())) return b;
    }
    return 'متفرقه';
}

function extractSizeFromTitle(title) {
    // منطق استخراج سایز از عنوان تلویزیون
    const match = title.match(/(\d{2,3})\s*اینچ/);
    return match ? match[1] : 'نامشخص';
}

function extractTechFromTitle(title) {
    const lower = title.toLowerCase();
    if (lower.includes('qled')) return 'QLED';
    if (lower.includes('oled')) return 'OLED';
    return 'LED';
}

function extractCapacity(title) {
    // مثال: "یخچال ۲۱ فوت"
    const match = title.match(/(\d+)\s*فوت/);
    return match ? match[1] : 'نامشخص';
}

function extractEnergyRating(title) {
    // مثال: "A++"
    const match = title.match(/[A+]+/);
    return match ? match[0] : 'نامشخص';
}
