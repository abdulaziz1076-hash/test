export const translations = {
  ar: {
    siteTitle: "سوق المشاريع",
    siteSubtitle: "المشاريع في الامارات",
    navHome: "الرئيسية",
    navMarket: "السوق",
    navServices: "الخدمات العامة",
    navRegister: "تسجيل مشروع",
    footerText: "منصة المشاريع الإماراتية",
    privacyLink: "سياسة الخصوصية",
    termsLink: "شروط الاستخدام",
    copyright: "© 2026 سوق المشاريع - جميع الحقوق محفوظة",
    heroTitle: "سوق المشاريع",
    heroSubtitle: "منصة متخصصة في المشاريع المنزلية",
    discoverBtn: "ادخل السوق",
    joinBtn: "سجل مشروعك",
    servicesBtn: "الخدمات العامة",
    aboutTitle: "من نحن",
    forShopperTitle: "للباحث عن منتج",
    forShopperDesc: "اكتشف منتجات محلية بإيدين إماراتية ومقيمة...",
    forProjectOwnerTitle: "لصاحب المشروع",
    forProjectOwnerDesc: "سجل مشروعك مجاناً...",
    stat1: "مشاريع",
    stat2: "منتجات متنوعة",
    stat3: "طلبات تواصل",
    stat4: "شركاء داعمين",
    familiesPageTitle: "المشاريع",
    familiesPageSubtitle: "استعرض المشاريع في الإمارات",
    productsTitle: "المنتجات",
    favoritesPageTitle: "المفضلة",
    emptyFavoritesProducts: "لا توجد منتجات في المفضلة بعد",
    contactSeller: "تواصل مع البائع",
    shareProduct: "مشاركة المنتج",
    specifications: "المواصفات والتفاصيل",
    popupTitle: "كيف تطلب؟",
    step1: "تصفح المنتجات",
    step2: "واختر ما يعجبك",
    step3: "تواصل مع البائع",
    gotItBtn: "إغلاق",
    addToFavorites: "تمت الإضافة للمفضلة",
    removeFromFavorites: "تمت الإزالة من المفضلة",
    licensed: "مرخص",
    servicesButtonCurrent: "الخدمات العامة",
    coverage: "التغطية",
    emirates: { all: "كل الإمارات", دبي: "دبي", أبوظبي: "أبوظبي", الشارقة: "الشارقة" },
    categories: { all: "الكل", "أطعمة ومشروبات": "أطعمة ومشروبات", "روائح وعطور": "روائح وعطور" },
    feedbackBtn: "شكوى أو اقتراح",
  },
  en: {
    siteTitle: "Souq Almasharie",
    siteSubtitle: "Projects in UAE",
    navHome: "Home",
    navMarket: "Market",
    navServices: "Services",
    navRegister: "Register Project",
    footerText: "UAE Projects Platform",
    privacyLink: "Privacy Policy",
    termsLink: "Terms of Use",
    copyright: "© 2026 Souq Almasharie - All Rights Reserved",
    servicesButtonCurrent: "Public Services",
    heroTitle: "Souq Almasharie",
    heroSubtitle: "A specialized platform supporting projects in the UAE",
    discoverBtn: "Enter the market",
    joinBtn: "Register Project",
    servicesBtn: "Services",
    aboutTitle: "About Us",
    forShopperTitle: "For Product Seekers",
    forShopperDesc: "Discover local products made by Emirati and resident hands...",
    forProjectOwnerTitle: "For Project Owners",
    forProjectOwnerDesc: "Register your project for free...",
    stat1: "Projects",
    stat2: "Diverse Products",
    stat3: "Contact Requests",
    stat4: "Supporting Partners",
    familiesPageTitle: "Projects",
    familiesPageSubtitle: "Review the projects in the UAE",
    productsTitle: "Products",
    favoritesPageTitle: "Favorites",
    emptyFavoritesProducts: "No favorite products yet",
    contactSeller: "Contact Seller",
    shareProduct: "Share Product",
    specifications: "Specifications & Details",
    popupTitle: "How to Order?",
    step1: "Browse Products",
    step2: "Choose what you like",
    step3: "Contact the Seller",
    gotItBtn: "Got it",
    addToFavorites: "Added to favorites",
    removeFromFavorites: "Removed from favorites",
    licensed: "Licensed",
    coverage: "Coverage",
    emirates: { all: "All Emirates", دبي: "Dubai", أبوظبي: "Abu Dhabi", الشارقة: "Sharjah" },
    categories: { all: "All", "أطعمة ومشروبات": "Food & Beverages", "روائح وعطور": "Scents & Perfumes" },
    feedbackBtn: "Complaint or Suggestion"
  }
};

let currentLang = localStorage.getItem('projectSouqLang') || 'ar';

export function t(key) {
  const keys = key.split('.');
  let val = translations[currentLang];
  for (let k of keys) {
    if (val && val[k] !== undefined) val = val[k];
    else return key;
  }
  return val;
}

export function setLanguage(lang) {
  if (lang === 'ar' || lang === 'en') {
    currentLang = lang;
    localStorage.setItem('projectSouqLang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    window.dispatchEvent(new Event('languageChanged'));
  }
}

export function getCurrentLang() {
  return currentLang;
}
