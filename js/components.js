import { t, getCurrentLang, setLanguage } from './i18n.js';

export function renderHeader() {
  const lang = getCurrentLang();
  return `
    <header class="app-header">
      <div class="header-container">
        <div class="logo-section" onclick="window.location.href='/'">
          <div class="logo-icon"><img src="images/logo.png" alt="سوق المشاريع"></div>
          <div class="logo-text"><h1>${t('siteTitle')}</h1><p>${t('siteSubtitle')}</p></div>
        </div>
        <div class="header-actions">
          <div class="lang-toggle" id="langToggleBtn"><i class="fas fa-globe"></i><span>${lang === 'ar' ? 'English' : 'عربي'}</span></div>
          <div class="menu-toggle" id="menuToggleBtn"><i class="fas fa-bars"></i></div>
        </div>
      </div>
      <div class="nav-menu" id="navMenu">
        <div class="nav-item" onclick="window.location.href='/'"><i class="fas fa-home"></i><span>${t('navHome')}</span></div>
        <div class="nav-item" onclick="window.location.href='/#projects'"><i class="fas fa-store"></i><span>${t('navMarket')}</span></div>
        <div class="nav-item" onclick="window.location.href='/services.html'"><i class="fas fa-cogs"></i><span>${t('navServices')}</span></div>
        <div class="nav-item" onclick="window.location.href='/register.html'"><i class="fas fa-user-plus"></i><span>${t('navRegister')}</span></div>
      </div>
    </header>
  `;
}

export function renderFooter() {
  return `
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-logo">${t('siteTitle')}</div>
        <p style="font-size: 11px; opacity: 0.9;">${t('footerText')}</p>
        <div style="font-size: 10px; color: #aaa; text-align: center; direction: ${getCurrentLang() === 'ar' ? 'rtl' : 'ltr'};">
          ${getCurrentLang() === 'ar' ? 'سوق المشاريع | منصة المشاريع المنزلية في الإمارات | دليل الأسر المنتجة' : 'Souq Almasharie | Home Projects Platform in UAE | Productive Families Directory'}
        </div>
        <div style="display: flex; justify-content: center; gap: 20px; margin: 15px 0; flex-wrap: wrap;">
          <a href="privacy.html" style="color: var(--secondary); text-decoration: none; font-size: 12px;"><i class="fas fa-lock"></i> ${t('privacyLink')}</a>
          <span style="color: var(--gray);">|</span>
          <a href="terms.html" style="color: var(--secondary); text-decoration: none; font-size: 12px;"><i class="fas fa-file-contract"></i> ${t('termsLink')}</a>
        </div>
        <div class="copyright">${t('copyright')}</div>
      </div>
    </footer>
  `;
}

export function updateHeaderAndFooter() {
  const headerElem = document.querySelector('header');
  const footerElem = document.querySelector('footer');
  if (headerElem) headerElem.outerHTML = renderHeader();
  if (footerElem) footerElem.outerHTML = renderFooter();
  attachHeaderEvents();
}

function attachHeaderEvents() {
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) langBtn.onclick = () => {
    const newLang = getCurrentLang() === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    updateHeaderAndFooter();
    window.dispatchEvent(new Event('languageChanged'));
  };
  const menuBtn = document.getElementById('menuToggleBtn');
  if (menuBtn) menuBtn.onclick = () => document.getElementById('navMenu')?.classList.toggle('active');
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('navMenu');
    const btn = document.getElementById('menuToggleBtn');
    if (menu && menu.classList.contains('active') && !menu.contains(e.target) && !btn.contains(e.target))
      menu.classList.remove('active');
  });
}
