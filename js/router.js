import { renderHeader, renderFooter, updateHeaderAndFooter } from './components.js';
import { renderProjectsPage } from './pages/projects.js';
import { renderProjectDetails } from './pages/project-details.js';
import { renderProductDetails } from './pages/product-details.js';

let currentView = 'home';

export function initRouter() {
  // إدراج الهيدر والفوت في كل صفحة (في الصفحات التي تستخدم SPA – index.html)
  if (document.getElementById('app')) {
    document.getElementById('app-header-placeholder').innerHTML = renderHeader();
    document.getElementById('app-footer-placeholder').innerHTML = renderFooter();
    attachHeaderEvents();
  }
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(p => p);
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  if (parts[0] === '' || parts[0] === 'home') {
    renderHomePage(mainContent);
  } else if (parts[0] === 'projects') {
    renderProjectsPage(mainContent);
  } else if (parts[0] === 'project' && parts[1]) {
    renderProjectDetails(mainContent, parts[1]);
  } else if (parts[0] === 'product' && parts[1] && parts[2]) {
    renderProductDetails(mainContent, parts[1], parts[2]);
  } else {
    renderHomePage(mainContent);
  }
}

function renderHomePage(container) {
  // يمكنك جلب محتوى HTML الصفحة الرئيسية من ملف منفصل أو بناؤه هنا
  container.innerHTML = `... محتوى الصفحة الرئيسية (يمكن نقله من index.html الأصلي) ...`;
  // ثم تهيئة أي سكريبتات خاصة بالصفحة الرئيسية
}

// attachHeaderEvents موجودة في components.js
