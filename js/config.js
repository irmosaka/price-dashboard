const categories = {
    tv: {
        name: 'تلویزیون',
        folder: 'tv',
        sources: {
            digikala: {
                label: 'دیجی‌کالا',
                icon: 'https://www.digikala.com/statics/img/png/footerlogo2.webp',
                parser: (raw) => {
                    const products = [];

                    // همه کلیدهای عنوان محصول
                    const titleEntries = Object.entries(raw)
                        .filter(([k, v]) => k.startsWith('ellipsis-2') && typeof v === 'string' && v.trim().length > 5);

                    titleEntries.forEach(([titleKey, title]) => {
                        // استخراج پسوند (مثلاً "" یا " (2)" یا " (3)")
                        let suffix = '';
                        const m = titleKey.match(/ellipsis-2( \(\d+\))?/);
                        if (m && m[1]) suffix = m[1];

                        const priceStr = raw['flex' + suffix] || '0';
                        const price = parseInt(String(priceStr).replace(/[^0-9]/g, '')) || 0;

                        // محصولات خیلی ارزان یا بدون قیمت رو رد کن
                        if (price < 1000000) return;

                        const originalPriceStr = raw['text-neutral-300' + suffix] || priceStr;
                        const originalPrice = parseInt(String(originalPriceStr).replace(/[^0-9]/g, '')) || price;

                        products.push({
                            name: title.trim(),
                            brand: extractBrandFromTitle(title),
                            size: extractSizeFromTitle(title),
                            tech: extractTechFromTitle(title),
                            price: price,
                            originalPrice: originalPrice,
                            discount: raw['text-body2-strong (2)' + suffix] || '—',
                            rating: raw['text-body2-strong' + suffix] || '—',
                            stock: raw['text-caption' + suffix] || 'نامشخص',
                            link: raw['block href' + suffix] || '#'
                        });
                    });

                    return products;
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
            { type: 'select', label: 'تکنولوژی', field: 'tech', options: ['LED', 'OLED', 'QLED', 'MiniLED'] }
        ],
        charts: [
            { type: 'bar', title: 'میانگین قیمت برند', groupBy: 'brand', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'میانگین قیمت بر اساس سایز', groupBy: 'size', value: 'price', aggregate: 'avg' },
            { type: 'bar', title: 'تعداد محصولات هر برند', groupBy: 'brand', value: 'count' }
        ]
    }
};

// ==================== توابع کمکی ====================
function extractBrandFromTitle(title) {
    if (!title) return 'متفرقه';
    const lower = title.toLowerCase().replace(/‌/g, ' ');

    const brands = [
        { keys: ['سامسونگ', 'samsung'], name: 'سامسونگ' },
        { keys: ['ال جی', 'ال‌جی', 'lg'], name: 'ال‌جی' },
        { keys: ['اسنوا', 'snowa'], name: 'اسنوا' },
        { keys: ['دوو', 'daewoo'], name: 'دوو' },
        { keys: ['هایسنس', 'hisense'], name: 'هایسنس' },
        { keys: ['پاناسونیک', 'panasonic'], name: 'پاناسونیک' },
        { keys: ['سونی', 'sony'], name: 'سونی' },
        { keys: ['ایکس ویژن', 'ایکس‌ویژن', 'x.vision', 'xvision'], name: 'ایکس‌ویژن' },
        { keys: ['آیوا', 'aiwa'], name: 'آیوا' },
        { keys: ['تی سی ال', 'تی‌سی‌ال', 'tcl'], name: 'تی‌سی‌ال' },
        { keys: ['جی پلاس', 'جی‌پلاس', 'gplus', 'g-plus'], name: 'جی‌پلاس' },
        { keys: ['جی وی سی', 'جی‌وی‌سی', 'jvc'], name: 'جی‌وی‌سی' },
        { keys: ['توشیبا', 'toshiba'], name: 'توشیبا' },
        { keys: ['مکسن', 'maxeon'], name: 'مکسن' },
        { keys: ['دنای', 'denay'], name: 'دنای' },
        { keys: ['کارونیل'], name: 'کارونیل' },
        { keys: ['لئوکو'], name: 'لئوکو' },
        { keys: ['بویمن'], name: 'بویمن' },
        { keys: ['لیماک'], name: 'لیماک' },
        { keys: ['بلانتون'], name: 'بلانتون' },
        { keys: ['دی کد'], name: 'دی‌کد' }
    ];

    for (const brand of brands) {
        for (const key of brand.keys) {
            if (lower.includes(key.toLowerCase())) {
                return brand.name;
            }
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
    if (lower.includes('qled') || lower.includes('کیو ال ای دی') || lower.includes('کیو‌ال‌ای‌دی')) return 'QLED';
    if (lower.includes('oled') || lower.includes('اولد')) return 'OLED';
    if (lower.includes('miniled') || lower.includes('مینی ال ای دی') || lower.includes('mini led')) return 'MiniLED';
    return 'LED';
}

function toPersianDigits(num) {
    if (num === undefined || num === null) return '—';
    return num.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
