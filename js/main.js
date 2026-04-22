// main.js - كامل مع التعديلات المطلوبة
import { APP_CONFIG } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);
let projectsData = [];
let contactsData = {};

// ==================== App State ====================
const appState = {
    currentPage: 'home',
    currentEmirate: 'all',
    currentCategory: 'all',
    currentFamilyId: null,
    currentProductId: null,
    searchQuery: '',
    currentLanguage: 'ar',
    favorites: (() => {
        try {
            return JSON.parse(localStorage.getItem('projectSouqFavorites')) || [];
        } catch (e) {
            return [];
        }
    })(),
    currentZoomImages: [],
    currentZoomIndex: 0
};

// ==================== Helper: Build Sell Points ====================
function buildSellPoints(contact) {
    const points = [];
    if (contact.instagram) points.push({ type: 'instagram', value: contact.instagram });
    if (contact.telegram) points.push({ type: 'telegram', value: contact.telegram });
    if (contact.snapchat) points.push({ type: 'snapchat', value: contact.snapchat });
    if (contact.tiktok) points.push({ type: 'tiktok', value: contact.tiktok });
    if (contact.facebook) points.push({ type: 'facebook', value: contact.facebook });
    if (contact.twitter) points.push({ type: 'twitter', value: contact.twitter });
    if (contact.website) points.push({ type: 'website', value: contact.website });
    return points;
}

// ==================== Load Data from Supabase ====================
async function loadProjectsFromSupabase() {
    try {
        showLoader();
        console.log('🔄 Loading data from Supabase...');

        const { data: projects, error } = await supabase
            .from('projects')
            .select(`
                *,
                products (*),
                deals (*),
                contacts (*)
            `);

        if (error) throw error;
        if (!projects || projects.length === 0) {
            console.warn('⚠️ No projects found');
            projectsData = [];
            return;
        }

        projectsData = projects.map(project => ({
            id: project.id,
            name: project.name_ar,
            nameEn: project.name_en,
            is_paid: project.is_paid,
            emirate: project.emirate,
            description: project.description_ar,
            descriptionEn: project.description_en,
            longDescription: project.long_description_ar,
            longDescriptionEn: project.long_description_en,
            image: project.image,
            adra_license: project.adra_license ? "نعم" : "لا",
            coverage: project.coverage,
            category: project.category_ar,
            categoryEn: project.category_en,
            products: (project.products || []).map(p => ({
                id: p.id,
                name: p.name_ar,
                nameEn: p.name_en,
                description: p.description_ar,
                descriptionEn: p.description_en,
                longDescription: p.long_description_ar,
                longDescriptionEn: p.long_description_en,
                mainImage: p.main_image,
                images: p.images || [],
                details: p.details_ar || [],
                detailsEn: p.details_en || [],
                category: p.category_ar,
                categoryEn: p.category_en
            })),
            deals: (project.deals || []).map(d => ({
                id: d.id,
                title: d.title_ar,
                titleEn: d.title_en,
                description: d.description_ar,
                descriptionEn: d.description_en,
                image: d.image,
                images: d.images || [],
                badge: d.badge_ar,
                badgeEn: d.badge_en,
                expiry: d.expiry_date
            })),
            whatsapp: null,
            phone: null,
            email: null,
            sell_points: []
        }));

        contactsData = {};
        projects.forEach(project => {
            const contact = project.contacts;
            if (contact) {
                const sellPoints = [];
                if (contact.instagram) sellPoints.push({ type: 'instagram', value: contact.instagram });
                if (contact.telegram) sellPoints.push({ type: 'telegram', value: contact.telegram });
                if (contact.snapchat) sellPoints.push({ type: 'snapchat', value: contact.snapchat });
                if (contact.tiktok) sellPoints.push({ type: 'tiktok', value: contact.tiktok });
                if (contact.facebook) sellPoints.push({ type: 'facebook', value: contact.facebook });
                if (contact.twitter) sellPoints.push({ type: 'twitter', value: contact.twitter });
                if (contact.website) sellPoints.push({ type: 'website', value: contact.website });

                contactsData[project.id] = {
                    whatsapp: contact.whatsapp || null,
                    phone: contact.phone || null,
                    email: contact.email || null,
                    sell_points: sellPoints
                };
            } else {
                contactsData[project.id] = { whatsapp: null, phone: null, email: null, sell_points: [] };
            }
        });

        projectsData.forEach(project => {
            const contact = contactsData[project.id];
            if (contact) {
                project.whatsapp = contact.whatsapp;
                project.phone = contact.phone;
                project.email = contact.email;
                project.sell_points = contact.sell_points;
            }
        });

        console.log(`✅ Loaded ${projectsData.length} projects`);

        if (appState.currentPage === 'families') renderFamilies();
        else if (appState.currentPage === 'products' && appState.currentFamilyId) showFamilyProducts(appState.currentFamilyId, false);
        else if (appState.currentPage === 'product-detail' && appState.currentFamilyId && appState.currentProductId) showProductDetail(appState.currentFamilyId, appState.currentProductId, false);
        else if (appState.currentPage === 'offers') renderOffers();

    } catch (error) {
        console.error('❌ Supabase error:', error);
        showToast('حدث خطأ في تحميل البيانات، يرجى تحديث الصفحة');
        projectsData = [];
    } finally {
        hideLoader();
    }
}

// ==================== Scroll Position ====================
function saveScrollPosition() {
    let pageType = 'home', pageId = '';
    if (appState.currentPage === 'families') { pageType = 'families'; pageId = appState.currentEmirate; }
    else if (appState.currentPage === 'products') { pageType = 'products'; pageId = appState.currentFamilyId; }
    else if (appState.currentPage === 'product-detail') { pageType = 'product'; pageId = `${appState.currentFamilyId}_${appState.currentProductId}`; }
    else if (appState.currentPage === 'favorites') { pageType = 'favorites'; }
    else if (appState.currentPage === 'offers') { pageType = 'offers'; }
    const scrollKey = `scroll_${pageType}_${pageId}`;
    sessionStorage.setItem(scrollKey, window.scrollY);
}

async function restoreScrollPosition() {
    let pageType = 'home', pageId = '';
    if (appState.currentPage === 'families') { pageType = 'families'; pageId = appState.currentEmirate; }
    else if (appState.currentPage === 'products') { pageType = 'products'; pageId = appState.currentFamilyId; }
    else if (appState.currentPage === 'product-detail') { pageType = 'product'; pageId = `${appState.currentFamilyId}_${appState.currentProductId}`; }
    else if (appState.currentPage === 'favorites') { pageType = 'favorites'; }
    else if (appState.currentPage === 'offers') { pageType = 'offers'; }
    const scrollKey = `scroll_${pageType}_${pageId}`;
    const savedPosition = sessionStorage.getItem(scrollKey);
    if (savedPosition && parseInt(savedPosition) > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
        window.scrollTo({ top: parseInt(savedPosition), behavior: 'auto' });
    } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
    }
}

function saveScrollBeforeNavigate() { saveScrollPosition(); }
function setupScrollSaveOnUnload() { window.addEventListener('beforeunload', () => saveScrollPosition()); }

// ==================== Loader ====================
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('show');
}
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.remove('show');
}
function ensureLoaderHidden() { setTimeout(() => hideLoader(), 100); }

// ==================== Gallery Functions ====================
let currentProductImagesArray = [];
let currentProductImageIndex = 0;

function changeMainImage(imgSrc, element, index) {
    const mainImage = document.getElementById('currentMainImage');
    if (mainImage) mainImage.src = imgSrc;
    document.querySelectorAll('.product-thumbnail').forEach(thumb => thumb.classList.remove('active'));
    if (element) element.classList.add('active');
    currentProductImageIndex = index;
}

function openZoomGallery(images, startIndex = 0) {
    if (!images || images.length === 0) return;
    startIndex = Math.min(Math.max(0, startIndex), images.length - 1);
    appState.currentZoomImages = images;
    appState.currentZoomIndex = startIndex;
    const modal = document.getElementById('zoomModal');
    const container = document.getElementById('zoomImageContainer');
    const dotsContainer = document.getElementById('zoomDots');
    if (!modal || !container || !dotsContainer) return;
    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    images.forEach((img, idx) => {
        const slide = document.createElement('div');
        slide.className = 'zoom-slide';
        slide.innerHTML = `<img src="${img}" loading="lazy">`;
        container.appendChild(slide);
        const dot = document.createElement('div');
        dot.className = `zoom-dot ${idx === startIndex ? 'active' : ''}`;
        dot.setAttribute('data-index', idx);
        dot.onclick = (function(i) { return function() { scrollToZoomImage(i); }; })(idx);
        dotsContainer.appendChild(dot);
    });
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const slideWidth = container.clientWidth;
        if (slideWidth > 0) {
            if (appState.currentLanguage === 'ar') container.scrollLeft = (images.length - 1 - startIndex) * slideWidth;
            else container.scrollLeft = startIndex * slideWidth;
        }
    }, 100);
    modal.onclick = function(e) { if (e.target === modal) closeZoomModal(); };
}

function openZoomFromMainImage() {
    if (currentProductImagesArray && currentProductImagesArray.length > 0) {
        let indexToShow = currentProductImageIndex;
        if (indexToShow === undefined || indexToShow < 0 || indexToShow >= currentProductImagesArray.length) indexToShow = 0;
        openZoomGallery(currentProductImagesArray, indexToShow);
    }
}

function closeZoomModal() {
    const modal = document.getElementById('zoomModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    appState.currentZoomImages = [];
    appState.currentZoomIndex = 0;
}

function scrollToZoomImage(index) {
    const container = document.getElementById('zoomImageContainer');
    if (!container) return;
    const targetSlide = container.children[index];
    if (targetSlide) targetSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// ==================== Favorites ====================
function isFavorite(id, type) { return appState.favorites.includes(`${type}_${id}`); }

function toggleFavorite(id, type) {
    const key = `${type}_${id}`;
    const index = appState.favorites.indexOf(key);
    const t = translations[appState.currentLanguage];
    if (index === -1) {
        appState.favorites.push(key);
        showToast(t.addToFavorites);
    } else {
        appState.favorites.splice(index, 1);
        showToast(t.removeFromFavorites);
    }
    localStorage.setItem('projectSouqFavorites', JSON.stringify(appState.favorites));
    updateFavoriteUI(id, type);
    if (appState.currentPage === 'favorites') renderFavorites();
}

function updateFavoriteUI(id, type) {
    document.querySelectorAll(`.favorite-btn[data-id="${id}"][data-type="${type}"]`).forEach(btn => {
        if (isFavorite(id, type)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    if (type === 'product') {
        document.querySelectorAll(`.product-card[data-product-id="${id}"]`).forEach(card => {
            if (isFavorite(id, 'product')) card.classList.add('favorite-active');
            else card.classList.remove('favorite-active');
        });
    }
}

function showFavorites() { navigateTo('/favorites'); }

function renderFavorites() {
    const container = document.getElementById('favoritesContent');
    const t = translations[appState.currentLanguage];
    const favoriteProducts = [];
    projectsData.forEach(family => {
        family.products.forEach(product => {
            if (isFavorite(product.id, 'product')) favoriteProducts.push({ family, product });
        });
    });
    if (favoriteProducts.length === 0) {
        container.innerHTML = `<div class="empty-favorites"><i class="fas fa-heart"></i><p>${t.emptyFavoritesProducts}</p></div>`;
        return;
    }
    let html = '<div class="favorites-list">';
    favoriteProducts.forEach(({ family, product }) => {
        const productName = appState.currentLanguage === 'ar' ? product.name : product.nameEn;
        const familyName = appState.currentLanguage === 'ar' ? family.name : family.nameEn;
        html += `
            <div class="favorite-list-item" onclick="navigateTo('/product/${family.id}/${product.id}')">
                <div class="favorite-item-image"><img src="${product.mainImage || product.image}" alt="${productName}" loading="lazy"></div>
                <div class="favorite-item-info">
                    <div class="favorite-item-title">${productName}</div>
                    <div class="favorite-item-meta"><i class="fas fa-store"></i> <span>${familyName}</span></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ==================== Parse Sell Points ====================
function parseSellPoints(sellPoints) {
    if (!sellPoints || !Array.isArray(sellPoints)) return [];
    return sellPoints.map(sp => {
        let type = sp.type;
        let value = sp.value;
        let cleanValue = value.replace(/^@/, '');
        let url = '', icon = '', bg = '';
        switch (type) {
            case 'instagram': url = `https://instagram.com/${cleanValue}`; icon = 'fa-instagram'; bg = 'instagram-bg'; break;
            case 'twitter': url = `https://x.com/${cleanValue}`; icon = 'fa-x'; bg = 'x-bg'; break;
            case 'telegram': url = `https://t.me/${cleanValue}`; icon = 'fa-telegram'; bg = 'telegram-bg'; break;
            case 'snapchat': url = `https://snapchat.com/add/${cleanValue}`; icon = 'fa-snapchat'; bg = 'snapchat-bg'; break;
            case 'tiktok': url = `https://tiktok.com/@${cleanValue}`; icon = 'fa-tiktok'; bg = 'tiktok-bg'; break;
            case 'facebook': url = `https://facebook.com/${cleanValue}`; icon = 'fa-facebook'; bg = 'facebook-bg'; break;
            case 'website': url = value.startsWith('http') ? value : `https://${value}`; icon = 'fa-globe'; bg = 'website-bg'; break;
            default: url = value; icon = 'fa-globe'; bg = 'website-bg';
        }
        return { url, icon, bg, type };
    });
}

// ==================== Translations ====================
const translations = {
    ar: {
        siteTitle: "سوق المشاريع", 
        paidBadge: "مميز", 
        privacy: "سياسة الخصوصية", 
        terms: "شروط الاستخدام",
        dealsTitle: "العروض والباقات:", 
        viewingDeal: "جاري عرض تفاصيل العرض...", 
        expiryUntil: "ينتهي",
        siteSubtitle: "المشاريع في الامارات", 
        navHome: "الرئيسية", 
        navMarket: "السوق", 
        navRegister: "تسجيل مشروع",
        navFavorites: "المفضلة", 
        footerLogo: "سوق المشاريع", 
        footerText: "منصة المشاريع الإماراتية",
        forShopperTitle: "للباحث عن منتج", 
        forShopperDesc: "اكتشف منتجات محلية بأيادٍ إماراتية ومقيمة...",
        forProjectOwnerTitle: "لصاحب المشروع", 
        forProjectOwnerDesc: "سجل مشروعك مجاناً...",
        copyright: "© 2026 سوق المشاريع - جميع الحقوق محفوظة", 
        langBtn: "En",
        heroTitle: "سوق المشاريع", 
        heroSubtitle: "منصة متخصصة في المشاريع المنزلية",
        discoverBtn: "ادخل السوق", 
        joinBtn: "سجل مشروعك", 
        aboutTitle: "من نحن",
        stat1: "مشاريع", 
        stat2: "منتجات متنوعة", 
        stat3: "طلبات تواصل", 
        stat4: "شركاء داعمين",
        badge1: "قريباً", 
        badge2: "قريباً", 
        badge3: "قريباً", 
        badge4: "قريباً",
        navServices: "الخدمات العامة", 
        navArticles: "المقالات الإرشادية", 
        navDelivery: "شركات التوصيل",
        homeSearchPlaceholder: "ابحث عن منتج أو مشروع...",
        familiesPageTitle: "المشاريع", 
        familiesPageSubtitle: "استعرض المشاريع في الامارات",
        familiesSearchPlaceholder: "ابحث عن مشروع أو منتج...", 
        productsTitle: "المنتجات",
        favoritesPageTitle: "المفضلة", 
        favoritesPageSubtitle: "المنتجات التي أضفتها", 
        emptyFavoritesProducts: "لا توجد منتجات في المفضلة بعد",
        sellerInfo: "معلومات البائع", 
        similarProducts: "منتجات مشابهة", 
        contactSeller: "تواصل مع البائع",
        shareProduct: "مشاركة المنتج", 
        shareProfile: "مشاركة المشروع", 
        specifications: "المواصفات والتفاصيل",
        popupTitle: "كيف تطلب؟", 
        step1: "تصفح المنتجات", 
        step2: "واختر ما يعجبك", 
        step3: "تواصل مع البائع", 
        gotItBtn: "إغلاق",
        shareTitle: "مشاركة المنتج", 
        copyLinkText: "نسخ الرابط", 
        closeShareBtn: "إغلاق",
        offersBtnText: "العروض", 
        offersPageTitle: "العروض الخاصة", 
        offersPageSubtitle: "أحدث العروض والباقات",
        addToFavorites: "تمت الإضافة للمفضلة", 
        removeFromFavorites: "تمت الإزالة من المفضلة", 
        linkCopied: "تم نسخ الرابط!",
        licensed: "مرخص", 
        coverage: "التغطية",
        descriptionLabel: "نبذة عن المشروع", 
        noContact: "لا توجد معلومات تواصل",
        noProjects: "لا مشاريع متاحة", 
        viewProducts: "المنتجات", 
        call: "اتصال", 
        email: "البريد الإلكتروني",
        registerTitle: "سجل مشروعك الآن", 
        registerViaX: "راسلنا على منصة X", 
        registerViaInstagram: "راسلنا على انستغرام",
        registerViaTikTok: "راسلنا على تيك توك",
        confirmTitle: "تأكيد الخروج",
        confirmMessage: "سيتم نقلك إلى موقع خارجي للتواصل مع البائع. هل تريد المتابعة؟",
        cancelBtn: "إلغاء",
        proceedBtn: "متابعة",
        servicesButtonCurrent: "الخدمات العامة",
        emirates: { all: "كل الإمارات", أبوظبي: "أبوظبي", دبي: "دبي", الشارقة: "الشارقة", عجمان: "عجمان", "رأس الخيمة": "رأس الخيمة", الفجيرة: "الفجيرة", "أم القيوين": "أم القيوين" },
        categories: { all: "الكل", "أطعمة ومشروبات": "أطعمة ومشروبات", "الرقميات": "الرقميات", "روائح وعطور": "روائح وعطور", عناية: "عناية", حلويات: "حلويات", تجميل: "تجميل", ملابس: "ملابس", يدويات: "يدويات", هدايا: "هدايا", عطارة: "عطارة", فنون: "فنون", نباتات: "نباتات", ترفيه: "ترفيه" },
        coverageOptions: { "الإمارة فقط": "الإمارة فقط", "جميع إمارات الدولة": "جميع إمارات الدولة", "دول الخليج": "دول الخليج", "العالم": "العالم" }
    },
    en: {
        siteTitle: "Souq Almasharie", 
        registerTitle: "Register Your Project Now", 
        registerViaX: "Message us on X",
        registerViaInstagram: "Message us on Instagram", 
        registerViaTikTok: "Message us on TikTok", 
        paidBadge: "Featured",
        servicesButtonCurrent: "Public Services",
        dealsTitle: "Offers & Packages", 
        viewingDeal: "Viewing deal details...", 
        expiryUntil: "Expires",
        siteSubtitle: "Projects in UAE", 
        navHome: "Home", navMarket: "Market", 
        navRegister: "Register Project",
        navFavorites: "Favorites", 
        footerLogo: "Souq Almasharie", 
        footerText: "UAE Projects Platform",
        forShopperTitle: "For Product Seekers",
        forShopperDesc: "Discover local products made by Emirati and resident hands...",
        forProjectOwnerTitle: "For Project Owners",
        forProjectOwnerDesc: "Register your project for free...",
        copyright: "© 2026 Souq Almasharie - All Rights Reserved", 
        langBtn: "عربي",
        heroTitle: "Souq Almasharie", 
        heroSubtitle: "A specialized platform supporting projects in the UAE",
        discoverBtn: "Enter the market", 
        joinBtn: "Register Project", 
        aboutTitle: "About Us",
        stat1: "Projects", 
        stat2: "Diverse Products", 
        stat3: "Contact Requests", 
        stat4: "Supporting Partners",
        badge1: "Coming Soon", 
        badge2: "Coming Soon", 
        badge3: "Coming Soon", 
        badge4: "Coming Soon",
        navServices: "Services", 
        navArticles: "Guidance Articles", 
        navDelivery: "Delivery Companies",
        homeSearchPlaceholder: "Search for product or project...",
        familiesPageTitle: "Projects", 
        familiesPageSubtitle: "Review the projects in the UAE",
        familiesSearchPlaceholder: "Search for project or product...", 
        productsTitle: "Products",
        favoritesPageTitle: "Favorites", 
        favoritesPageSubtitle: "Your favorite products", 
        emptyFavoritesProducts: "No favorite products yet",
        sellerInfo: "Seller Info", 
        similarProducts: "Similar Products", 
        offersBtnText: "Offers",
        offersPageTitle: "Special Offers",
         offersPageSubtitle: "Latest offers and packages",
        contactSeller: "Contact Seller", 
        shareProduct: "Share Product", 
        shareProfile: "Share Project",
        specifications: "Specifications & Details", 
        popupTitle: "How to Order?", 
        step1: "Browse Products",
        step2: "Choose what you like", 
        step3: "Contact the Seller", 
        gotItBtn: "Got it",
        shareTitle: "Share Product", 
        copyLinkText: "Copy Link", 
        closeShareBtn: "Close",
        addToFavorites: "Added to favorites", 
        removeFromFavorites: "Removed from favorites", 
        linkCopied: "Link copied!",
        licensed: "Licensed", 
        coverage: "Coverage", 
        descriptionLabel: "About the Project", 
        noContact: "No contact information",
        noProjects: "No projects available", 
        viewProducts: "Products", 
        call: "Call", 
        email: "Email",
        confirmTitle: "Confirm redirect",
        confirmMessage: "You will be redirected to an external site to contact the seller. Proceed?",
        cancelBtn: "Cancel",
        proceedBtn: "Proceed",
        emirates: { all: "All Emirates", أبوظبي: "Abu Dhabi", دبي: "Dubai", الشارقة: "Sharjah", عجمان: "Ajman", "رأس الخيمة": "Ras Al Khaimah", الفجيرة: "Fujairah", "أم القيوين": "Umm Al Quwain" },
        categories: { all: "All", "أطعمة ومشروبات": "Food & Beverages", "الرقميات": "IT", "روائح وعطور": "Scents & Perfumes", عناية: "Care", حلويات: "Sweets", تجميل: "Beauty", ملابس: "Clothes", يدويات: "Handmade", هدايا: "Gifts", عطارة: "Apothecary", فنون: "Arts", نباتات: "Plants", ترفيه: "Entertainment" },
        coverageOptions: { "الإمارة فقط": "Emirate only", "جميع إمارات الدولة": "All emirates", "دول الخليج": "GCC", "العالم": "Worldwide" }
    }
};

// ==================== Navigation ====================
function navigateTo(path) {
    saveScrollBeforeNavigate();
    showLoader();
    window.location.hash = path;
}

function goBack() {
    saveScrollBeforeNavigate();
    window.history.back();
}

function scrollToTop() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    hideLoader();
}

function toggleMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('active');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const pageElement = document.getElementById(pageId + '-page');
    if (pageElement) pageElement.style.display = 'block';
    appState.currentPage = pageId;
}

// ==================== Filters ====================
function initEmiratesChips() {
    const container = document.getElementById('emiratesScroll');
    if (!container) return;
    const t = translations[appState.currentLanguage];
    const emirates = [
        { id: 'all', name: t.emirates.all, icon: 'fas fa-flag' },
        { id: 'أبوظبي', name: t.emirates.أبوظبي, icon: 'fas fa-city' },
        { id: 'دبي', name: t.emirates.دبي, icon: 'fas fa-city' },
        { id: 'الشارقة', name: t.emirates.الشارقة, icon: 'fas fa-city' },
        { id: 'عجمان', name: t.emirates.عجمان, icon: 'fas fa-city' },
        { id: 'رأس الخيمة', name: t.emirates["رأس الخيمة"], icon: 'fas fa-city' },
        { id: 'الفجيرة', name: t.emirates.الفجيرة, icon: 'fas fa-city' },
        { id: 'أم القيوين', name: t.emirates["أم القيوين"], icon: 'fas fa-city' }
    ];
    container.innerHTML = emirates.map(e => `
        <div class="emirate-chip ${e.id === appState.currentEmirate ? 'active' : ''}" onclick="filterByEmirate('${e.id}')">
            <i class="${e.icon}"></i><span>${e.name}</span>
        </div>
    `).join('');
}

function updateActiveEmirateChip(emirateId) {
    document.querySelectorAll('.emirate-chip').forEach(chip => chip.classList.remove('active'));
    document.querySelectorAll('.emirate-chip').forEach(chip => {
        const span = chip.querySelector('span');
        if (span) {
            const t = translations[appState.currentLanguage];
            if (emirateId === 'all' && span.innerText === t.emirates.all) chip.classList.add('active');
            else if (span.innerText === t.emirates[emirateId]) chip.classList.add('active');
        }
    });
}

function initCategoriesChips() {
    const container = document.getElementById('categoriesScroll');
    if (!container) return;
    const t = translations[appState.currentLanguage];
    const categories = [
        { id: 'all', name: t.categories.all, icon: 'fas fa-th-large' },
        { id: 'أطعمة ومشروبات', name: t.categories["أطعمة ومشروبات"], icon: 'fas fa-utensils' },
        { id: 'الرقميات', name: t.categories["الرقميات"], icon: 'fas fa-laptop-code' },
        { id: 'روائح وعطور', name: t.categories["روائح وعطور"], icon: 'fas fa-wind' },
        { id: 'عناية', name: t.categories.عناية, icon: 'fas fa-spa' },
        { id: 'حلويات', name: t.categories.حلويات, icon: 'fas fa-cookie-bite' },
        { id: 'تجميل', name: t.categories.تجميل, icon: 'fas fa-magic' },
        { id: 'ملابس', name: t.categories.ملابس, icon: 'fas fa-tshirt' },
        { id: 'يدويات', name: t.categories.يدويات, icon: 'fas fa-cut' },
        { id: 'هدايا', name: t.categories.هدايا, icon: 'fas fa-gift' },
        { id: 'عطارة', name: t.categories.عطارة, icon: 'fa-solid fa-mortar-pestle' },
        { id: 'فنون', name: t.categories.فنون, icon: 'fas fa-paint-brush' },
        { id: 'نباتات', name: t.categories.نباتات, icon: 'fas fa-seedling' },
        { id: 'ترفيه', name: t.categories.ترفيه, icon: 'fas fa-gamepad' }
    ];
    container.innerHTML = categories.map(c => `
        <div class="category-chip ${c.id === appState.currentCategory ? 'active' : ''}" onclick="filterByCategory('${c.id}')">
            <i class="${c.icon}"></i><span>${c.name}</span>
        </div>
    `).join('');
}

function updateActiveCategoryChip(categoryId) {
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
        const span = chip.querySelector('span');
        if (span) {
            const t = translations[appState.currentLanguage];
            if (categoryId === 'all' && span.innerText === t.categories.all) chip.classList.add('active');
            else if (span.innerText === t.categories[categoryId]) chip.classList.add('active');
        }
    });
}

function filterByEmirate(emirateId) {
    showLoader();
    appState.currentEmirate = emirateId;
    appState.currentCategory = 'all';
    appState.searchQuery = '';
    updateActiveEmirateChip(emirateId);
    updateActiveCategoryChip('all');
    const searchInput = document.getElementById('familiesSearch');
    if (searchInput) searchInput.value = '';
    navigateTo(`/projects/emirate/${encodeURIComponent(emirateId)}`);
    hideLoader();
}

function filterByCategory(id) {
    showLoader();
    appState.currentCategory = id;
    updateActiveCategoryChip(id);
    renderFamilies();
    hideLoader();
}

// ==================== Search ====================
function performHomeSearch() {
    showLoader();
    const query = document.getElementById('homeSearch').value.trim();
    appState.searchQuery = query;
    navigateTo('/projects/emirate/all');
    setTimeout(() => {
        const searchInput = document.getElementById('familiesSearch');
        if (searchInput) searchInput.value = query;
        renderFamilies();
        hideLoader();
    }, 50);
}

function performFamiliesSearch() {
    showLoader();
    const input = document.getElementById('familiesSearch');
    if (!input) return;
    appState.searchQuery = input.value.trim();
    renderFamilies();
    hideLoader();
}

// ==================== Render Families ====================
function renderFamilies() {
    let filtered = [...projectsData];
    const t = translations[appState.currentLanguage];
    if (appState.currentEmirate !== 'all') filtered = filtered.filter(f => f.emirate === appState.currentEmirate);
    if (appState.currentCategory !== 'all') filtered = filtered.filter(f => f.category === appState.currentCategory);
    if (appState.searchQuery) {
        const query = appState.searchQuery.trim().toLowerCase();
        if (query !== '') {
            filtered = filtered.filter(family => {
                const nameAr = (family.name || '').toLowerCase();
                const nameEn = (family.nameEn || '').toLowerCase();
                const descAr = (family.description || '').toLowerCase();
                const descEn = (family.descriptionEn || '').toLowerCase();
                const longDescAr = (family.longDescription || '').toLowerCase();
                const longDescEn = (family.longDescriptionEn || '').toLowerCase();
                const productMatch = family.products.some(p => {
                    const pNameAr = (p.name || '').toLowerCase();
                    const pNameEn = (p.nameEn || '').toLowerCase();
                    const pDescAr = (p.description || '').toLowerCase();
                    const pDescEn = (p.descriptionEn || '').toLowerCase();
                    const pLongDescAr = (p.longDescription || '').toLowerCase();
                    const pLongDescEn = (p.longDescriptionEn || '').toLowerCase();
                    const pDetails = (p.details || []).join(' ').toLowerCase();
                    const pDetailsEn = (p.detailsEn || []).join(' ').toLowerCase();
                    return pNameAr.includes(query) || pNameEn.includes(query) ||
                           pDescAr.includes(query) || pDescEn.includes(query) ||
                           pLongDescAr.includes(query) || pLongDescEn.includes(query) ||
                           pDetails.includes(query) || pDetailsEn.includes(query);
                });
                return nameAr.includes(query) || nameEn.includes(query) ||
                       descAr.includes(query) || descEn.includes(query) ||
                       longDescAr.includes(query) || longDescEn.includes(query) ||
                       productMatch;
            });
        }
    }
    const sortedProjects = [...filtered].sort((a, b) => (a.is_paid && !b.is_paid) ? -1 : (!a.is_paid && b.is_paid) ? 1 : 0);
    const grid = document.getElementById('familiesGrid');
    if (sortedProjects.length === 0) {
        grid.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 30px;">${t.noProjects}</div>`;
        return;
    }
    grid.innerHTML = sortedProjects.map(family => {
        const familyName = appState.currentLanguage === 'ar' ? family.name : family.nameEn;
        const familyDesc = appState.currentLanguage === 'ar' ? family.description : family.descriptionEn;
        const licenseBadge = family.adra_license === 'نعم' ? `<div class="license-badge-card"><i class="fas fa-check-circle"></i>${t.licensed}</div>` : '';
        const paidBadge = family.is_paid ? `<div class="paid-badge-red"><i class="fas fa-fire"></i><span>${t.paidBadge}</span></div>` : '';
        return `
            <div class="family-card" onclick="navigateTo('/family/${family.id}')">
                ${paidBadge}
                ${licenseBadge}
                <div class="family-image"><img src="${family.image}" alt="${familyName}" loading="lazy"></div>
                <div class="family-content">
                    <h3 class="family-name">${familyName}</h3>
                    <div class="family-location"><i class="fas fa-map-marker-alt"></i> ${t.emirates[family.emirate] || family.emirate}</div>
                    <div class="family-description">${familyDesc}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== Offers ====================
function showOffersPage() { navigateTo('/offers'); }

function renderOffers() {
    const container = document.getElementById('offersContent');
    const t = translations[appState.currentLanguage];
    let allOffers = [];
    projectsData.forEach(family => {
        if (family.deals && family.deals.length > 0) {
            family.deals.forEach(deal => {
                allOffers.push({
                    ...deal,
                    familyId: family.id,
                    familyName: appState.currentLanguage === 'ar' ? family.name : family.nameEn,
                    familyImage: family.image
                });
            });
        }
    });
    if (allOffers.length === 0) {
        container.innerHTML = `<div class="empty-favorites"><i class="fas fa-tags"></i><p>${appState.currentLanguage === 'ar' ? 'لا توجد عروض حالياً' : 'No offers available'}</p></div>`;
        return;
    }
    let html = '<div class="favorites-list">';
    allOffers.forEach(offer => {
        const offerTitle = appState.currentLanguage === 'ar' ? offer.title : (offer.titleEn || offer.title);
        const offerDesc = appState.currentLanguage === 'ar' ? offer.description : (offer.descriptionEn || offer.description);
        const offerBadge = appState.currentLanguage === 'ar' ? (offer.badge || 'عرض') : (offer.badgeEn || offer.badge || 'Offer');
        html += `
            <div class="favorite-list-item" onclick="navigateTo('/family/${offer.familyId}')">
                <div class="favorite-item-image"><img src="${offer.image}" alt="${offerTitle}" loading="lazy"></div>
                <div class="favorite-item-info">
                    <div class="favorite-item-title">${offerTitle}</div>
                    <div class="favorite-item-meta">
                        <i class="fas fa-store"></i> <span>${offer.familyName}</span>
                        <span class="project-badge" style="background: #C41E3A; color: white; border: none;">${offerBadge}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--gray); margin-top: 5px;">${offerDesc}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderFamilyDeals(family) {
    const dealsSection = document.getElementById('dealsSection');
    const dealsGrid = document.getElementById('dealsGrid');
    if (!family.deals || family.deals.length === 0) {
        if (dealsSection) dealsSection.style.display = 'none';
        return;
    }
    if (dealsSection) dealsSection.style.display = 'block';
    const t = translations[appState.currentLanguage];
    if (dealsGrid) {
        dealsGrid.innerHTML = family.deals.map(deal => {
            const dealTitle = appState.currentLanguage === 'ar' ? deal.title : (deal.titleEn || deal.title);
            const dealDesc = appState.currentLanguage === 'ar' ? deal.description : (deal.descriptionEn || deal.description);
            const dealBadge = appState.currentLanguage === 'ar' ? (deal.badge || 'عرض') : (deal.badgeEn || deal.badge || 'Offer');
            return `
                <div class="deal-card" onclick="showDealDetails(${family.id}, '${deal.id}')">
                    <div class="deal-badge">${dealBadge}</div>
                    <div class="deal-image"><img src="${deal.image}" alt="${dealTitle}" loading="lazy"></div>
                    <div class="deal-content">
                        <h4 class="deal-title">${dealTitle}</h4>
                        <p class="deal-description">${dealDesc}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function showDealDetails(familyId, dealId) {
    const family = projectsData.find(f => f.id == familyId);
    if (!family) return;
    const deal = family.deals?.find(d => d.id === dealId);
    if (!deal) return;
    const images = deal.images && deal.images.length > 0 ? deal.images : [deal.image];
    openZoomGallery(images, 0);
    const t = translations[appState.currentLanguage];
    showToast(t.viewingDeal);
}

// ==================== Show Family Products ====================
function showFamilyProducts(id, updateHash = true) {
    hideLoader();
    const family = projectsData.find(f => f.id == id);
    if (!family) return;
    const contactInfo = contactsData[id] || {};
    family.whatsapp = contactInfo.whatsapp || null;
    family.phone = contactInfo.phone || null;
    family.email = contactInfo.email || null;
    family.sell_points = contactInfo.sell_points || [];
    appState.currentFamilyId = id;
    if (updateHash) {
        navigateTo(`/family/${id}`);
        return;
    }
    const t = translations[appState.currentLanguage];
    const familyName = appState.currentLanguage === 'ar' ? family.name : family.nameEn;
    const familyDescription = appState.currentLanguage === 'ar' ? (family.longDescription || family.description) : (family.longDescriptionEn || family.descriptionEn);
    const licenseBadgeHtml = family.adra_license === 'نعم' ? `<div class="license-badge-large"><i class="fas fa-check-circle"></i> ${t.licensed}</div>` : '';
    const feedbackButtonHtml = `<div class="action-btn feedback-btn" onclick="event.stopPropagation(); openFeedbackModal(${family.id}, '${familyName}')" title="${t.feedbackBtn || 'شكوى أو اقتراح'}"><i class="fas fa-comment-dots"></i></div>`;
    const shareButtonHtml = `<div class="action-btn share-btn" onclick="event.stopPropagation(); showProfileSharePopup(event, ${family.id})" title="${t.shareProfile}"><i class="fas fa-share-alt"></i></div>`;
    const profileContainer = document.getElementById('familyProfileContainer');
    if (profileContainer) {
        profileContainer.innerHTML = `
    <div class="family-profile">
        <div class="profile-header">
            ${shareButtonHtml}
            ${feedbackButtonHtml}
            <div class="profile-avatar" style="background-image: url('${family.image}');"></div>
            <div>
                <h2 class="profile-name">${familyName}</h2>
                ${licenseBadgeHtml}
                <div class="profile-location"><i class="fas fa-map-marker-alt"></i> ${t.emirates[family.emirate] || family.emirate}</div>
            </div>
        </div>
        ...
    </div>
`;
    }
    renderFamilyDeals(family);
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.innerHTML = family.products.map(p => {
            const productName = appState.currentLanguage === 'ar' ? p.name : p.nameEn;
            const productDesc = appState.currentLanguage === 'ar' ? p.description : p.descriptionEn;
            const productCategory = appState.currentLanguage === 'ar' ? p.category : p.categoryEn;
            const tCat = translations[appState.currentLanguage].categories;
            const categoryDisplay = tCat[p.category] || productCategory;
            const isFav = isFavorite(p.id, 'product');
            return `
                <div class="product-card ${isFav ? 'favorite-active' : ''}" data-product-id="${p.id}" onclick="navigateTo('/product/${family.id}/${p.id}')">
                    <div class="product-image"><img src="${p.mainImage || p.image}" alt="${productName}" loading="lazy"></div>
                    <div class="product-content">
                        <h3 class="product-name">${productName}</h3>
                        <div class="product-description">${productDesc}</div>
                        <div class="product-category">${categoryDisplay}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    let contactHtml = '';
    if (family.whatsapp) {
        const whatsappUrl = `https://wa.me/${String(family.whatsapp).replace(/[^0-9]/g, '')}`;
        contactHtml += `<a href="#" onclick="handleContact('${whatsappUrl}', 'whatsapp'); return false;" class="contact-item"><div class="contact-icon whatsapp-bg"><i class="fab fa-whatsapp"></i></div></a>`;
    }
    if (family.phone) {
        const phoneUrl = `tel:${family.phone}`;
        contactHtml += `<a href="#" onclick="handleContact('${phoneUrl}', 'phone'); return false;" class="contact-item"><div class="contact-icon phone-bg"><i class="fas fa-phone"></i></div></a>`;
    }
    if (family.email) {
        const emailUrl = `mailto:${family.email}`;
        contactHtml += `<a href="#" onclick="handleContact('${emailUrl}', 'email'); return false;" class="contact-item"><div class="contact-icon email-bg"><i class="fas fa-envelope"></i></div></a>`;
    }
    if (family.sell_points && Array.isArray(family.sell_points)) {
        const parsed = parseSellPoints(family.sell_points);
        parsed.forEach(p => {
            contactHtml += `<a href="#" onclick="handleContact('${p.url}', '${p.type}'); return false;" class="contact-item"><div class="contact-icon ${p.bg}"><i class="fab ${p.icon}"></i></div></a>`;
        });
    }
    const contactSection = document.getElementById('contactSectionBottom');
    if (contactSection) {
        contactSection.innerHTML = `<h3 class="contact-title"><i class="fas fa-phone-alt"></i> ${t.contactSeller}</h3><div class="contact-grid">${contactHtml || `<p>${t.noContact}</p>`}</div>`;
    }
    showPage('products');
    showInstructionPopupOnce();
    setTimeout(() => restoreScrollPosition(), 200);
    setTimeout(() => ensureLoaderHidden(), 100);
}

// ==================== Show Product Detail ====================
function showProductDetail(familyId, productId, updateHash = true) {
    hideLoader();
    const family = projectsData.find(f => f.id == familyId);
    if (!family) return;
    const contactInfo = contactsData[familyId] || {};
    family.whatsapp = contactInfo.whatsapp || null;
    family.phone = contactInfo.phone || null;
    family.email = contactInfo.email || null;
    family.sell_points = contactInfo.sell_points || [];
    const product = family.products.find(p => p.id === productId);
    if (!product) return;
    appState.currentFamilyId = familyId;
    appState.currentProductId = productId;
    if (updateHash) {
        navigateTo(`/product/${familyId}/${productId}`);
        return;
    }
    const t = translations[appState.currentLanguage];
    const familyName = appState.currentLanguage === 'ar' ? family.name : family.nameEn;
    const productName = appState.currentLanguage === 'ar' ? product.name : product.nameEn;
    const productDesc = appState.currentLanguage === 'ar' ? (product.longDescription || product.description) : (product.longDescriptionEn || product.descriptionEn);
    const productCategory = appState.currentLanguage === 'ar' ? product.category : product.categoryEn;
    const tCat = translations[appState.currentLanguage].categories;
    const categoryDisplay = tCat[product.category] || productCategory;
    const images = product.images && product.images.length > 0 ? product.images : [product.mainImage || product.image];
    currentProductImagesArray = images;
    currentProductImageIndex = 0;
    const thumbnailsHtml = images.map((img, index) => `
        <div class="product-thumbnail ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this, ${index})">
            <img src="${img}" loading="lazy">
        </div>
    `).join('');
    const details = appState.currentLanguage === 'ar' ? product.details : product.detailsEn;
    const detailsHtml = details && details.length ? details.map(d => `<li><i class="fas fa-check-circle"></i> ${d}</li>`).join('') : '';
    const specsHtml = detailsHtml ? `<h3 class="product-details-title"><i class="fas fa-list-ul"></i> ${t.specifications}</h3><ul class="product-details-list">${detailsHtml}</ul>` : '';
    const similarProducts = family.products.filter(p => p.id !== productId).slice(0, 4);
    const similarHtml = similarProducts.map(p => {
        const similarName = appState.currentLanguage === 'ar' ? p.name : p.nameEn;
        return `<div class="similar-product-card" onclick="showProductDetail(${familyId}, '${p.id}')"><div class="similar-product-image"><img src="${p.mainImage || p.image}" loading="lazy"></div><div class="similar-product-info"><h4>${similarName}</h4></div></div>`;
    }).join('');
    const licenseBadgeHtml = family.adra_license === 'نعم' ? `<div class="license-badge-large" style="margin-right: 0; margin-bottom: 5px;"><i class="fas fa-check-circle"></i> ${t.licensed}</div>` : '';
    let sellerContactHtml = '';
    if (family.whatsapp) {
        const whatsappUrl = `https://wa.me/${String(family.whatsapp).replace(/[^0-9]/g, '')}`;
        sellerContactHtml += `<a href="#" onclick="handleContact('${whatsappUrl}', 'whatsapp'); return false;" class="seller-contact-item"><div class="seller-contact-icon whatsapp-bg"><i class="fab fa-whatsapp"></i></div></a>`;
    }
    if (family.phone) {
        const phoneUrl = `tel:${family.phone}`;
        sellerContactHtml += `<a href="#" onclick="handleContact('${phoneUrl}', 'phone'); return false;" class="seller-contact-item"><div class="seller-contact-icon phone-bg"><i class="fas fa-phone"></i></div></a>`;
    }
    if (family.email) {
        const emailUrl = `mailto:${family.email}`;
        sellerContactHtml += `<a href="#" onclick="handleContact('${emailUrl}', 'email'); return false;" class="seller-contact-item"><div class="seller-contact-icon email-bg"><i class="fas fa-envelope"></i></div></a>`;
    }
    if (family.sell_points && Array.isArray(family.sell_points)) {
        const parsed = parseSellPoints(family.sell_points);
        parsed.forEach(p => {
            sellerContactHtml += `<a href="#" onclick="handleContact('${p.url}', '${p.type}'); return false;" class="seller-contact-item"><div class="seller-contact-icon ${p.bg}"><i class="fab ${p.icon}"></i></div></a>`;
        });
    }
    const isFav = isFavorite(product.id, 'product');
    const html = `
        <div class="product-gallery">
            <div class="product-main-image-container">
                <div class="main-image" onclick="openZoomFromMainImage()">
                    <img src="${images[0]}" alt="${productName}" id="currentMainImage" loading="lazy">
                </div>
                <div class="action-btn favorite-btn ${isFav ? 'active' : ''}" data-id="${product.id}" data-type="product" onclick="event.stopPropagation(); toggleFavorite('${product.id}', 'product')"><i class="fas fa-heart"></i></div>
                <div class="action-btn share-btn" data-family-id="${familyId}" data-product-id="${productId}"><i class="fas fa-share-alt"></i></div>
            </div>
            <div class="product-thumbnails" id="productThumbnails">${thumbnailsHtml}</div>
        </div>
        <div class="product-detail-info">
            <span class="product-detail-category"><i class="fas fa-tag"></i> ${categoryDisplay}</span>
            <h1 class="product-detail-name">${productName}</h1>
            <p class="product-detail-description">${productDesc}</p>
            ${specsHtml}
        </div>
        <div class="seller-info-card">
            <div class="seller-avatar-large"><img src="${family.image}" alt="${familyName}" loading="lazy"></div>
            <div class="seller-info">
                <h3>${familyName}</h3>
                ${licenseBadgeHtml}
                <div class="seller-meta"><i class="fas fa-map-marker-alt"></i> ${t.emirates[family.emirate] || family.emirate}</div>
                ${sellerContactHtml ? `<div class="seller-contact-grid">${sellerContactHtml}</div>` : ''}
            </div>
        </div>
        ${similarHtml ? `<div class="similar-products-section"><h3 class="similar-products-title"><i class="fas fa-boxes"></i> ${t.similarProducts}</h3><div class="similar-products-grid">${similarHtml}</div></div>` : ''}
    `;
    const container = document.getElementById('productDetailContainer');
    if (container) container.innerHTML = html;
    showPage('product-detail');
    requestAnimationFrame(() => {
        setTimeout(() => {
            hideLoader();
            restoreScrollPosition();
            ensureLoaderHidden();
        }, 50);
    });
}

// ==================== Hash Change Handler ====================
function handleHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(p => p !== '');
    const savedLang = localStorage.getItem('projectSouqLang');
    if (savedLang && savedLang !== appState.currentLanguage) {
        appState.currentLanguage = savedLang;
        toggleLanguage();
    }
    showLoader();
    if (parts.length === 0 || parts[0] === '') {
        showPage('home');
        ensureLoaderHidden();
    }
    else if (parts[0] === 'projects' && parts[1] === 'emirate' && parts[2]) {
        appState.currentEmirate = decodeURIComponent(parts[2]);
        appState.currentCategory = 'all';
        updateActiveEmirateChip(appState.currentEmirate);
        updateActiveCategoryChip('all');
        showPage('families');
        renderFamilies();
        const searchInput = document.getElementById('familiesSearch');
        if (searchInput && appState.searchQuery) searchInput.value = appState.searchQuery;
        setTimeout(() => restoreScrollPosition(), 200);
        ensureLoaderHidden();
    }
    else if (parts[0] === 'family' && parts[1]) {
        showFamilyProducts(parseInt(parts[1]), false);
    }
    else if (parts[0] === 'product' && parts[1] && parts[2]) {
        showProductDetail(parseInt(parts[1]), parts[2], false);
    }
    else if (parts[0] === 'favorites') {
        showPage('favorites');
        renderFavorites();
        setTimeout(() => restoreScrollPosition(), 100);
        ensureLoaderHidden();
    }
    else if (parts[0] === 'offers') {
        showPage('offers');
        renderOffers();
        setTimeout(() => restoreScrollPosition(), 100);
        ensureLoaderHidden();
    }
    else {
        showPage('home');
        ensureLoaderHidden();
    }
}

// ==================== Share Popups ====================
function showSharePopup(event, familyId, productId) {
    if (event) event.stopPropagation();
    
    // التأكد من تحميل البيانات
    if (!projectsData || projectsData.length === 0) {
        console.warn('projectsData not loaded yet');
        showToast('يرجى الانتظار قليلاً ثم المحاولة مرة أخرى');
        return;
    }
    
    const family = projectsData.find(f => f.id == familyId);
    if (!family) {
        console.error('Family not found', familyId);
        return;
    }
    const product = family.products.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found', productId);
        return;
    }
    
    const t = translations[appState.currentLanguage];
    const url = window.location.href;
    const text = encodeURIComponent(`${product.name} - ${family.name}`);
    const popup = document.getElementById('sharePopup');
    if (!popup) {
        console.error('sharePopup element not found');
        return;
    }
    
    // إعادة تعيين المحتوى
    popup.classList.remove('show');
    popup.innerHTML = `
        <h3>${t.shareTitle}</h3>
        <div class="share-options">
            <div class="share-option" onclick="window.open('https://wa.me/?text=${text} ${encodeURIComponent(url)}', '_blank'); closeSharePopup();">
                <i class="fab fa-whatsapp whatsapp-bg"></i><span>WhatsApp</span>
            </div>
            <div class="share-option" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}', '_blank'); closeSharePopup();">
                <i class="fab fa-facebook-f facebook-bg"></i><span>Facebook</span>
            </div>
            <div class="share-option" onclick="window.open('https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}', '_blank'); closeSharePopup();">
                <i class="fa-x x-bg"></i><span>X</span>
            </div>
            <div class="share-option" onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}', '_blank'); closeSharePopup();">
                <i class="fab fa-telegram-plane telegram-bg"></i><span>Telegram</span>
            </div>
            <div class="share-option" onclick="copyShareLink('${url}'); closeSharePopup();">
                <i class="fas fa-link copy-link-bg"></i><span>${t.copyLinkText}</span>
            </div>
        </div>
        <button class="share-close" onclick="closeSharePopup()">${t.closeShareBtn}</button>
    `;
    popup.classList.add('show');
}

function showProfileSharePopup(event, familyId) {
    if (event) event.stopPropagation();
    const family = projectsData.find(f => f.id == familyId);
    if (!family) return;
    const t = translations[appState.currentLanguage];
    const url = window.location.href;
    const text = encodeURIComponent(family.name);
    const popup = document.getElementById('shareProfilePopup');
    if (!popup) return;
    popup.classList.remove('show');
    popup.innerHTML = `
        <h3>${t.shareProfile}</h3>
        <div class="share-options">
            <div class="share-option" onclick="window.open('https://wa.me/?text=${text} ${encodeURIComponent(url)}', '_blank'); closeShareProfilePopup();">
                <i class="fab fa-whatsapp whatsapp-bg"></i><span>WhatsApp</span>
            </div>
            <div class="share-option" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}', '_blank'); closeShareProfilePopup();">
                <i class="fab fa-facebook-f facebook-bg"></i><span>Facebook</span>
            </div>
            <div class="share-option" onclick="window.open('https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}', '_blank'); closeShareProfilePopup();">
                <i class="fa-x x-bg"></i><span>X</span>
            </div>
            <div class="share-option" onclick="window.open('https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}', '_blank'); closeShareProfilePopup();">
                <i class="fab fa-telegram-plane telegram-bg"></i><span>Telegram</span>
            </div>
            <div class="share-option" onclick="copyShareLink('${url}'); closeShareProfilePopup();">
                <i class="fas fa-link copy-link-bg"></i><span>${t.copyLinkText}</span>
            </div>
        </div>
        <button class="share-close" onclick="closeShareProfilePopup()">${t.closeShareBtn}</button>
    `;
    popup.classList.add('show');
}

function closeSharePopup() {
    const popup = document.getElementById('sharePopup');
    if (popup) popup.classList.remove('show');
}
function closeShareProfilePopup() {
    const popup = document.getElementById('shareProfilePopup');
    if (popup) popup.classList.remove('show');
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast(translations[appState.currentLanguage].linkCopied);
    });
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast(translations[appState.currentLanguage].linkCopied);
        closeSharePopup();
    });
}

function copyProfileLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast(translations[appState.currentLanguage].linkCopied);
        closeShareProfilePopup();
    });
}

function shareVia(platform) {}
function shareProfileVia(platform) {}

// ==================== Contact Confirmation Modal (NEW) ====================
let contactPendingUrl = null;

function handleContact(url, type) {
    if (event) event.preventDefault();
    const modal = document.getElementById('contactConfirmModal');
    if (!modal) {
        console.error('Modal not found');
        window.open(url, '_blank');
        return;
    }
    contactPendingUrl = url;
    const t = translations[appState.currentLanguage];
    const modalHtml = `
        <div class="contact-confirm-content">
            <div class="contact-confirm-header">
                <i class="fas fa-external-link-alt"></i>
                <h3>${t.confirmTitle}</h3>
            </div>
            <div class="contact-confirm-body">
                <p>${t.confirmMessage}</p>
            </div>
            <div class="contact-confirm-buttons">
                <button class="confirm-cancel" onclick="closeContactConfirmModal()">${t.cancelBtn}</button>
                <button class="confirm-proceed" onclick="proceedToContact()">${t.proceedBtn}</button>
            </div>
        </div>
    `;
    modal.innerHTML = modalHtml;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeContactConfirmModal() {
    const modal = document.getElementById('contactConfirmModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
    contactPendingUrl = null;
}

function proceedToContact() {
    if (contactPendingUrl) {
        window.open(contactPendingUrl, '_blank');
    }
    closeContactConfirmModal();
}

// ==================== Social Contact Popup (already exists but ensure it's shown) ====================
function showSocialContact() {
    const currentLang = appState.currentLanguage || 'ar';
    const t = translations[currentLang];
    let popup = document.getElementById('socialContactPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'socialContactPopup';
        popup.className = 'instruction-popup';
        document.body.appendChild(popup);
        // Ensure styles exist (they are in style.css)
    }
    const registerUrl = 'registerr.html';
    popup.innerHTML = `
        <div class="popup-header">
            <i class="fas fa-hands-helping"></i>
            <h3>${t.registerTitle || (currentLang === 'ar' ? 'سجل مشروعك الآن' : 'Register Your Project Now')}</h3>
        </div>
        <div class="steps" style="margin-bottom: 15px;">
            <div class="step">
                <div class="step-icon"><i class="fab fa-x-twitter"></i></div>
                <span>${t.registerViaX || (currentLang === 'ar' ? 'راسلنا على منصة X' : 'Message us on X')}</span>
            </div>
            <div class="step">
                <div class="step-icon"><i class="fab fa-instagram"></i></div>
                <span>${t.registerViaInstagram || (currentLang === 'ar' ? 'راسلنا على انستغرام' : 'Message us on Instagram')}</span>
            </div>
            <div class="step">
                <div class="step-icon"><i class="fab fa-tiktok"></i></div>
                <span>${t.registerViaTikTok || (currentLang === 'ar' ? 'راسلنا على تيك توك' : 'Message us on TikTok')}</span>
            </div>
        </div>
        <div class="contact-buttons" style="display: flex; gap: 20px; justify-content: center; margin: 20px 0;">
            <a href="https://x.com/souqalmasharie" target="_blank" class="social-contact-btn" style="background: #000000; color: white; width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.3s ease; font-size: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <i class="fa-x"></i>
            </a>
            <a href="https://instagram.com/souqalmasharie" target="_blank" class="social-contact-btn" style="background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D); color: white; width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.3s ease; font-size: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <i class="fab fa-instagram"></i>
            </a>
            <a href="https://tiktok.com/@souqalmsharie" target="_blank" class="social-contact-btn" style="background: #000000; color: white; width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.3s ease; font-size: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <i class="fab fa-tiktok"></i>
            </a>
        </div>
        <button onclick="closeSocialContactPopup(); window.location.href='${registerUrl}';" style="background: linear-gradient(135deg, #0F3D2E, #1A5F44); color: white; border: 1px solid #D4AF37; padding: 12px 25px; border-radius: 40px; font-size: 16px; font-weight: 700; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
            <i class="fas fa-file-alt"></i>
            <span>${currentLang === 'ar' ? 'سجل مشروعك الآن' : 'Register Your Project Now'}</span>
        </button>
        <button class="close-btn" onclick="closeSocialContactPopup()">
            <i class="fas fa-check-circle"></i> 
            <span>${t.gotItBtn || (currentLang === 'ar' ? 'إغلاق' : 'Close')}</span>
        </button>
    `;
    popup.classList.add('show');
}

function closeSocialContactPopup() {
    const popup = document.getElementById('socialContactPopup');
    if (popup) popup.classList.remove('show');
}

// ==================== Toast & Instruction Popup ====================
function showToast(msg) {
    const toast = document.getElementById('toastMessage');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function closeInstructionPopup() {
    const popup = document.getElementById('instructionPopup');
    if (popup) popup.classList.remove('show');
}

function showInstructionPopupOnce() {
    if (!sessionStorage.getItem('instructionPopupShown')) {
        const popup = document.getElementById('instructionPopup');
        if (popup) popup.classList.add('show');
        sessionStorage.setItem('instructionPopupShown', 'true');
        setTimeout(() => closeInstructionPopup(), 8000);
    }
}

// ==================== Language Toggle ====================
function toggleLanguage() {
    const newLang = appState.currentLanguage === 'ar' ? 'en' : 'ar';
    appState.currentLanguage = newLang;
    localStorage.setItem('projectSouqLang', newLang);
    if (newLang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'ar');
        document.documentElement.classList.remove('en-mode');
        document.body.style.fontFamily = "'Almarai', sans-serif";
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
        document.documentElement.classList.add('en-mode');
        document.body.style.fontFamily = "'Poppins', 'Almarai', sans-serif";
    }
    const t = translations[newLang];
    const textElements = {
        'siteTitle': 'siteTitle', 'siteSubtitle': 'siteSubtitle',
        'servicesBtn': 'navServices', 'navHome': 'navHome', 'navMarket': 'navMarket',
        'navServices': 'navServices', 'navArticles': 'navArticles', 'navDelivery': 'navDelivery',
        'navRegister': 'navRegister', 'footerKeywords': 'footerKeywords',
        'forShopperTitle': 'forShopperTitle', 'forShopperDesc': 'forShopperDesc',
        'forProjectOwnerTitle': 'forProjectOwnerTitle', 'forProjectOwnerDesc': 'forProjectOwnerDesc',
        'navFavorites': 'navFavorites', 'footerLogo': 'footerLogo', 'footerText': 'footerText',
        'copyright': 'copyright', 'langBtn': 'langBtn', 'heroTitle': 'heroTitle',
        'heroSubtitle': 'heroSubtitle', 'discoverBtn': 'discoverBtn', 'joinBtn': 'joinBtn',
        'aboutTitle': 'aboutTitle', 'stat1': 'stat1', 'stat2': 'stat2', 'stat3': 'stat3', 'stat4': 'stat4',
        'badge1': 'badge1', 'badge2': 'badge2', 'badge3': 'badge3', 'badge4': 'badge4',
        'familiesPageTitle': 'familiesPageTitle', 'familiesPageSubtitle': 'familiesPageSubtitle',
        'productsTitle': 'productsTitle', 'favoritesPageTitle': 'favoritesPageTitle',
        'favoritesPageSubtitle': 'favoritesPageSubtitle', 'popupTitle': 'popupTitle',
        'step1': 'step1', 'step2': 'step2', 'step3': 'step3', 'gotItBtn': 'gotItBtn',
        'shareTitle': 'shareTitle', 'copyLinkText': 'copyLinkText', 'closeShareBtn': 'closeShareBtn',
        'offersBtnText': 'offersBtnText', 'offersPageTitle': 'offersPageTitle',
        'offersPageSubtitle': 'offersPageSubtitle', 'dealsTitle': 'dealsTitle',
        'privacyLink': 'privacy', 'termsLink': 'terms'
    };
    for (const [id, key] of Object.entries(textElements)) {
        const el = document.getElementById(id);
        if (el && t[key]) el.textContent = t[key];
    }
    const homeSearch = document.getElementById('homeSearch');
    if (homeSearch) homeSearch.placeholder = t.homeSearchPlaceholder;
    const familiesSearch = document.getElementById('familiesSearch');
    if (familiesSearch) familiesSearch.placeholder = t.familiesSearchPlaceholder;
    initEmiratesChips();
    initCategoriesChips();
    if (appState.currentPage === 'families') renderFamilies();
    else if (appState.currentPage === 'products' && appState.currentFamilyId) showFamilyProducts(appState.currentFamilyId, false);
    else if (appState.currentPage === 'product-detail' && appState.currentFamilyId && appState.currentProductId) showProductDetail(appState.currentFamilyId, appState.currentProductId, false);
    else if (appState.currentPage === 'favorites') renderFavorites();
    else if (appState.currentPage === 'offers') renderOffers();
}

// ==================== معالجة مشاركة المنتج عبر delegation ====================
document.addEventListener('click', function(e) {
    const shareBtn = e.target.closest('.share-btn');
    if (!shareBtn) return;
    e.stopPropagation();
    
    const familyId = shareBtn.dataset.familyId;
    const productId = shareBtn.dataset.productId;
    if (familyId && productId) {
        showSharePopup(e, familyId, productId);
    } else {
        // إذا لم يجد البيانات، قد يكون زر المشاركة في صفحة المشروع (يعمل بالطريقة القديمة)
        // نحتفظ بالتوافق مع الأزرار القديمة التي لا تحمل data attributes
        const onclickAttr = shareBtn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('showSharePopup')) {
            // تنفيذ الدالة بشكل مباشر (لن يحدث تعارض)
            eval(onclickAttr);
        }
    }
});

// ==================== Initialization ====================
window.addEventListener('load', async function() {
    setupScrollSaveOnUnload();
    const savedLang = localStorage.getItem('projectSouqLang');
    appState.currentLanguage = savedLang === 'en' ? 'en' : 'ar';
    if (appState.currentLanguage === 'en') document.body.classList.add('en-mode');
    else document.body.classList.remove('en-mode');
    const t = translations[appState.currentLanguage];
    const textElements = {
        'siteTitle': 'siteTitle', 'siteSubtitle': 'siteSubtitle',
        'navHome': 'navHome', 'navMarket': 'navMarket', 'navFavorites': 'navFavorites',
        'navRegister': 'navRegister', 'footerLogo': 'footerLogo', 'footerText': 'footerText',
        'copyright': 'copyright', 'langBtn': 'langBtn', 'heroTitle': 'heroTitle',
        'heroSubtitle': 'heroSubtitle', 'discoverBtn': 'discoverBtn', 'joinBtn': 'joinBtn',
        'aboutTitle': 'aboutTitle', 'stat1': 'stat1', 'stat2': 'stat2', 'stat3': 'stat3', 'stat4': 'stat4',
        'badge1': 'badge1', 'badge2': 'badge2', 'badge3': 'badge3', 'badge4': 'badge4',
        'familiesPageTitle': 'familiesPageTitle', 'familiesPageSubtitle': 'familiesPageSubtitle',
        'productsTitle': 'productsTitle', 'favoritesPageTitle': 'favoritesPageTitle',
        'favoritesPageSubtitle': 'favoritesPageSubtitle', 'popupTitle': 'popupTitle',
        'step1': 'step1', 'step2': 'step2', 'step3': 'step3', 'gotItBtn': 'gotItBtn',
        'shareTitle': 'shareTitle', 'copyLinkText': 'copyLinkText', 'closeShareBtn': 'closeShareBtn',
        'offersBtnText': 'offersBtnText', 'offersPageTitle': 'offersPageTitle',
        'offersPageSubtitle': 'offersPageSubtitle', 'dealsTitle': 'dealsTitle'
    };
    for (const [id, key] of Object.entries(textElements)) {
        const el = document.getElementById(id);
        if (el && t[key]) el.textContent = t[key];
    }
    const homeSearch = document.getElementById('homeSearch');
    if (homeSearch) homeSearch.placeholder = t.homeSearchPlaceholder;
    const familiesSearch = document.getElementById('familiesSearch');
    if (familiesSearch) familiesSearch.placeholder = t.familiesSearchPlaceholder;
    initEmiratesChips();
    initCategoriesChips();
    await loadProjectsFromSupabase();
    handleHashChange();
    setTimeout(() => hideLoader(), 100);
    const feedbackForm = document.getElementById('feedbackFormModal');
    if (feedbackForm) {
        feedbackForm.removeEventListener('submit', submitFeedback); // تجنب التكرار
        feedbackForm.addEventListener('submit', submitFeedback);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        const savedLang = localStorage.getItem('projectSouqLang');
        if (savedLang && savedLang !== appState.currentLanguage) {
            appState.currentLanguage = savedLang;
            toggleLanguage();
        } else {
            toggleLanguage();
        }
        if (appState.currentPage === 'families') renderFamilies();
        else if (appState.currentPage === 'products' && appState.currentFamilyId) showFamilyProducts(appState.currentFamilyId, false);
        else if (appState.currentPage === 'product-detail' && appState.currentFamilyId && appState.currentProductId) showProductDetail(appState.currentFamilyId, appState.currentProductId, false);
        else if (appState.currentPage === 'favorites') renderFavorites();
        else if (appState.currentPage === 'offers') renderOffers();
        hideLoader();
        ensureLoaderHidden();
    }
});

window.addEventListener('hashchange', handleHashChange);

// ==================== Expose Global Functions ====================
window.toggleMenu = toggleMenu;
window.showOffersPage = showOffersPage;
window.renderOffers = renderOffers;
window.navigateTo = navigateTo;
window.goBack = goBack;
window.scrollToTop = scrollToTop;
window.showPrivacyModal = function() { window.open(appState.currentLanguage === 'ar' ? 'privacy.html' : 'privacyEn.html', '_blank'); };
window.showTermsModal = function() { window.open(appState.currentLanguage === 'ar' ? 'terms.html' : 'termsEn.html', '_blank'); };
window.filterByCategory = filterByCategory;
window.filterByEmirate = filterByEmirate;
window.showFamilyProducts = showFamilyProducts;
window.showProductDetail = showProductDetail;
window.performHomeSearch = performHomeSearch;
window.performFamiliesSearch = performFamiliesSearch;
window.closeInstructionPopup = closeInstructionPopup;
window.scrollToContact = function() { const section = document.getElementById('contactSectionBottom'); if (section) section.scrollIntoView({ behavior: 'smooth' }); };
window.openZoomGallery = openZoomGallery;
window.closeZoomModal = closeZoomModal;
window.scrollToZoomImage = scrollToZoomImage;
window.toggleLanguage = toggleLanguage;
window.showSharePopup = showSharePopup;
window.showProfileSharePopup = showProfileSharePopup;
window.closeSharePopup = closeSharePopup;
window.closeShareProfilePopup = closeShareProfilePopup;
window.shareVia = shareVia;
window.shareProfileVia = shareProfileVia;
window.copyLink = copyLink;
window.copyProfileLink = copyProfileLink;
window.toggleFavorite = toggleFavorite;
window.showFavorites = showFavorites;
window.renderFamilyDeals = renderFamilyDeals;
window.showDealDetails = showDealDetails;
window.handleContact = handleContact;
window.showSocialContact = showSocialContact;
window.closeSocialContactPopup = closeSocialContactPopup;
window.closeContactConfirmModal = closeContactConfirmModal;
window.proceedToContact = proceedToContact;
window.openZoomFromMainImage = openZoomFromMainImage;
window.changeMainImage = changeMainImage;
window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.submitFeedback = submitFeedback;

// فتح مودال الشكاوى والاقتراحات
function openFeedbackModal(projectId, projectName) {
    document.getElementById('feedbackTargetIdModal').value = projectId;
    document.getElementById('feedbackTargetNameModal').value = projectName;
    document.getElementById('feedbackModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('active');
    document.body.style.overflow = '';
}

// إرسال البيانات إلى Supabase
async function submitFeedback(event) {
    event.preventDefault();
    const type = document.getElementById('feedbackTypeModal').value;
    const reporter_email = document.getElementById('feedbackEmailModal').value || null;
    const message = document.getElementById('feedbackMessageModal').value;
    const target_id = document.getElementById('feedbackTargetIdModal').value;
    const target_type = 'project'; // لأن الزر داخل صفحة المشروع

    const { data, error } = await supabase.from('feedbacks').insert([{
        type,
        target_type,
        target_id,
        reporter_email,
        message,
        status: 'pending'
    }]);

    const resultDiv = document.getElementById('feedbackResultModal');
    if (error) {
        resultDiv.innerHTML = `<span style="color:red;">❌ حدث خطأ: ${error.message}</span>`;
    } else {
        resultDiv.innerHTML = '<span style="color:green;">✅ تم إرسال رسالتك بنجاح. شكراً لك.</span>';
        document.getElementById('feedbackFormModal').reset();
        setTimeout(() => closeFeedbackModal(), 2000);
    }
}

// ربط الحدث
document.getElementById('feedbackFormModal')?.addEventListener('submit', submitFeedback);
