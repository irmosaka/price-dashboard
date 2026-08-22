const categories = {
    tv: {
        name: 'تلویزیون',
        folder: 'tv',
        sources: {
            digikala: {
                label: 'دیجی‌کالا',
                icon: 'https://www.digikala.com/statics/img/png/footerlogo2.webp',
                // این parser جدید همه محصولات داخل یک آبجکت رو جدا می‌کنه
                parser: (raw) => {
                    const products = [];

                    // پیدا کردن همه کلیدهایی که عنوان محصول دارن
                    const titleKeys = Object.keys(raw).filter(k => k.startsWith('ellipsis-2'));

                    titleKeys.forEach(key => {
                        const title = raw[key];
                        if (!title || typeof title !== 'string') return;

                        // پیدا کردن شماره ایندکس (مثلاً " (2)")
                        const match = key.match(/ellipsis-2(?: \((\d+)\))?/);
                        const index = match && match[1] ? ` (${match[1]})` : '';

                        // گرفتن فیلدهای مربوط به همین محصول
                        const priceKey = `flex${index}`;
                        const originalPriceKey = `text-neutral-300${index}`;
                        const discountKey = `text-body2-strong (2)${index}`;
                        const ratingKey = `text-body2-strong${index}`;
                        const stockKey = `text-caption${index}`;
                        const linkKey = `block href${index}`;

                        const price = parseInt((raw[priceKey] || '0').replace(/[^0-9]/g, '')) || 0;
                        if (price <= 0) return; // محصول بدون قیمت معتبر رو رد کن

                        products.push({
                            name: title,
                            brand: extractBrandFromTitle(title),
                            size: extractSizeFromTitle(title),
                            tech: extractTechFromTitle(title),
                            price: price,
                            originalPrice: parseInt((raw[originalPriceKey] || raw[priceKey] || '0').replace(/[^0-9]/g, '')) || 0,
                            discount: raw[discountKey] || '—',
                            rating: raw[ratingKey] || '—',
                            stock: raw[stockKey] || 'نامشخص',
                            link: raw[linkKey] || '#'
                        });
                    });

                    // اگر هیچ محصولی پیدا نشد، یک آبجکت خالی برگردون تا فیلتر نشکنه
                    return products.length > 0 ? products : [{
                        name: 'نامشخص',
                        brand: 'متفرقه',
                        size: 'نامشخص',
                        tech: 'LED',
                        price: 0,
                        originalPrice: 0,
                        discount: '—',
                        rating: '—',
                        stock: 'نامشخص',
                        link: '#'
                    }];
                },
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'سایز', field: 'size', sortable: true },
                    { label: 'تکنولوژی', field: 'tech', sortable: true },
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
                    size: extractSizeFromTitle(raw['ProductCard_desktop_product-name__JwqeK'] || ''),
                    tech: extractTechFromTitle(raw['ProductCard_desktop_product-name__JwqeK'] || ''),
                    price: parseInt((raw['ProductCard_desktop_product-price-text__y20OV'] || '0').replace(/[^0-9]/g, '')) || 0,
                    sellers: parseInt((raw['ProductCard_desktop_shops__mbtsF'] || '0').replace(/[^0-9]/g, '')) || 0,
                    link: raw['ProductCards_cards__MYvdn href'] || '#'
                }),
                columns: [
                    { label: 'نام محصول', field: 'name', sortable: true },
                    { label: 'برند', field: 'brand', sortable: true },
                    { label: 'سایز', field: 'size', sortable: true },
                    { label: 'تکنولوژی', field: 'tech', sortable: true },
                    { label: 'قیمت', field: 'price', sortable: true, render: v => toPersianDigits(v) + ' تومان' },
                    { label: 'تعداد فروشندگان', field: 'sellers', sortable: true, render: v => toPersianDigits(v) },
                    { label: 'لینک', field: 'link', render: v => `<a href="${v}" target="_blank">مشاهده</a>` }
                ]
            }
        },
        filters: [
            { type: 'range', label: 'حداقل قیمت', field: 'price', min: 0, max: 500000000, step: 1000000 },
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

    // بقیه دسته‌ها (یخچال و ...) رو فعلاً نگه داشتم تا خراب نشن
    // اگر لازم شد بعداً کامل می‌کنم
};

// ==================== توابع کمکی ====================
function extractBrandFromTitle(title) {
    if (!title) return 'متفرقه';
    const lower = title.toLowerCase();
    const brands = [
        'سامسونگ', 'ال‌جی', 'ال جی', 'اسنوا', 'دوو', 'هایسنس', 'پاناسونیک',
        'سونی', 'ایکس‌ویژن', 'ایکس ویژن', 'آیوا', 'تی‌سی‌ال', 'تی سی ال',
        'جی‌پلاس', 'جی پلاس', 'جی‌وی‌سی', 'جی وی سی', 'نکسار', 'پارس',
        'بویمن', 'لیماک', 'ورلد استار', 'توشیبا', 'مکسن', 'دنای',
        'کارونیل', 'لئوکو', 'گرین', 'بلانتون', 'دی کد'
    ];
    for (let b of brands) {
        if (lower.includes(b.toLowerCase().replace(/‌/g, ' ')) || lower.includes(b.toLowerCase())) {
            // نرمال‌سازی نام برند
            if (b.includes('ال') && b.includes('جی')) return 'ال‌جی';
            if (b.includes('ایکس') && b.includes('ویژن')) return 'ایکس‌ویژن';
            if (b.includes('تی') && b.includes('سی')) return 'تی‌سی‌ال';
            if (b.includes('جی') && b.includes('پلاس')) return 'جی‌پلاس';
            return b.replace(/ /g, '‌'); // تبدیل فاصله به نیم‌فاصله
        }
    }
    return 'متفرقه';
}

function extractSizeFromTitle(title) {
    const match = title.match(/(\d{2,3})\s*اینچ/);
    return match ? match[1] + ' اینچ' : 'نامشخص';
}

function extractTechFromTitle(title) {
    const lower = title.toLowerCase();
    if (lower.includes('qled') || lower.includes('کیو ال ای دی')) return 'QLED';
    if (lower.includes('oled') || lower.includes('اولد')) return 'OLED';
    if (lower.includes('miniled') || lower.includes('مینی ال ای دی')) return 'MiniLED';
    return 'LED';
}

function extractCapacity(title) {
    const match = title.match(/(\d+)\s*فوت/);
    return match ? match[1] : 'نامشخص';
}

function extractEnergyRating(title) {
    const match = title.match(/[A+]+/);
    return match ? match[0] : 'نامشخص';
}

function toPersianDigits(num) {
    if (num === undefined || num === null) return '—';
    return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
