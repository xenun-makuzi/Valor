import { escapeHTML } from '../../js/utils.js';
import { logout } from './admin-auth.js';

const NAV_ITEMS = [
  { href: 'index.html', label: 'Dashboard' },
  { href: 'cars.html', label: 'Cars' },
  { href: 'categories.html', label: 'Categories' },
  { href: 'tiers.html', label: 'Down Payment Tiers' },
  { href: 'sections.html', label: 'Homepage Sections' },
  { href: 'payment-methods.html', label: 'Payment Methods' },
  { href: 'orders.html', label: 'Orders' },
  { href: 'financing.html', label: 'Financing Applications' },
  { href: 'settings.html', label: 'Site Settings' },
];

// Renders the sidebar into #admin-sidebar-mount and wires the logout
// button. Call after requireAdmin() succeeds, passing its result and
// the current page's filename (e.g. 'cars.html') to highlight it.
export function renderAdminShell({ admin }, activeHref) {
  const mount = document.getElementById('admin-sidebar-mount');
  if (!mount) return;

  const navHTML = NAV_ITEMS.map(
    (item) => `<a href="${item.href}" class="admin-nav__link${item.href === activeHref ? ' is-active' : ''}">${item.label}</a>`
  ).join('');

  mount.outerHTML = `
    <aside class="admin-sidebar">
      <div class="admin-sidebar__brand">Valor Admin</div>
      <nav class="admin-nav">${navHTML}</nav>
      <a href="../index.html" class="admin-view-site" target="_blank" rel="noopener">View live site &rarr;</a>
      <div class="admin-sidebar__footer">
        <span>${escapeHTML(admin.name || 'Admin')}</span>
        <button type="button" class="admin-logout-btn" id="admin-logout-btn">Log Out</button>
      </div>
    </aside>
  `;

  document.getElementById('admin-logout-btn')?.addEventListener('click', logout);
}

// Small shared toast for save/delete confirmations and errors across
// every admin page.
export function showToast(message, isError = false) {
  document.querySelectorAll('.admin-toast').forEach((el) => el.remove());
  const toast = document.createElement('div');
  toast.className = 'admin-toast' + (isError ? ' admin-toast--error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}