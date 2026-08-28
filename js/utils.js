import { resolveImageUrl } from './supabase-client.js';

export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function escapeAttr(str) {
  return escapeHTML(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  return '$' + Number(amount).toLocaleString('en-US');
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Shared broken-image fallback. Any page that imports this module gets
// this wired up automatically — used via inline onerror="handleImgError(this)".
window.handleImgError = function (imgEl) {
  if (!imgEl) return;
  const wrap = imgEl.parentElement;
  if (!wrap) return;

  // Prevent infinite error loops if placeholder fails
  imgEl.onerror = null;

  // If inside a thumbnail button/wrapper, fall back gracefully without crashing
  if (wrap.classList.contains('car-card__media')) {
    imgEl.remove();
    const placeholder = document.createElement('div');
    placeholder.className = 'car-card__media--empty';
    placeholder.textContent = 'Photo coming soon';
    wrap.appendChild(placeholder);
  } else {
    // Basic fallback for generic image containers/thumbnails
    imgEl.style.opacity = '0.3';
    imgEl.alt = 'Image unavailable';
  }
};

// Shared car card, used on the homepage's featured-cars grid and on the
// car detail page's similar-vehicles grid.
export function carCardHTML(car) {
  const images = (car.car_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const imgUrl = images.length ? resolveImageUrl(images[0].storage_path) : null;
  const title = `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}`;
  const metaParts = [];
  if (car.mileage) metaParts.push(`${Number(car.mileage).toLocaleString()} mi`);
  if (car.transmission) metaParts.push(car.transmission);

  return `
    <a href="car-detail.html?id=${encodeURIComponent(car.id)}" class="car-card">
      <div class="car-card__media">
        ${imgUrl
          ? `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(title)}" loading="lazy" onerror="handleImgError(this)">`
          : `<div class="car-card__media--empty">Photo coming soon</div>`
        }
      </div>
      <div class="car-card__body">
        <h3 class="car-card__title">${escapeHTML(title)}</h3>
        <p class="car-card__meta">${escapeHTML(metaParts.join(' • '))}</p>
        <div class="car-card__pricing">
          <div>
            <span class="car-card__down-label">Down</span>
            <span class="car-card__down-amount">${formatCurrency(car.down_payment)}</span>
          </div>
          <div class="car-card__price-sub">
            ${car.monthly_payment ? `${formatCurrency(car.monthly_payment)}/mo` : ''}
            <span class="car-card__full-price">${formatCurrency(car.full_price)}</span>
          </div>
        </div>
      </div>
    </a>
  `;
}