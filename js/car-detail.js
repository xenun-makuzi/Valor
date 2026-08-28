import { supabase, resolveImageUrl } from './supabase-client.js';
import { escapeHTML, escapeAttr, formatCurrency, carCardHTML } from './utils.js';

// Global error handler for images to prevent layout breakage
window.handleImgError = window.handleImgError || function(img) {
  img.onerror = null;
  img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999">No Image</text></svg>';
};

const params = new URLSearchParams(window.location.search);
const carId = params.get('id');

const root = document.getElementById('car-detail-root');
const breadcrumbEl = document.getElementById('breadcrumb-current');
const similarSection = document.getElementById('similar-cars-root')?.closest('section');
const similarRoot = document.getElementById('similar-cars-root');

function showNotFound() {
  if (breadcrumbEl) breadcrumbEl.textContent = 'Not found';
  if (root) {
    root.innerHTML = `
      <div class="empty-state">
        <strong>Vehicle not found</strong>
        This listing may have been sold or removed. <a href="inventory.html">Browse available inventory</a> instead.
      </div>
    `;
  }
  similarSection?.remove();
}

function specRow(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<div class="spec-row"><span class="spec-row__label">${escapeHTML(label)}</span><span class="spec-row__value">${escapeHTML(String(value))}</span></div>`;
}

function renderFeatures(features) {
  if (!Array.isArray(features) || !features.length) return '';
  const itemsHTML = features.map((f) => `<li>${escapeHTML(f)}</li>`).join('');
  return `
    <div class="car-detail__features">
      <h2 class="section__title">Features</h2>
      <ul class="feature-list">${itemsHTML}</ul>
    </div>
  `;
}

function renderGallery(images, title) {
  if (!images.length) {
    return `<div class="gallery-main gallery-main--empty">No photos yet</div>`;
  }
  const mainUrl = resolveImageUrl(images[0].storage_path);
  const thumbsHTML = images.map((img, i) => {
    const url = resolveImageUrl(img.storage_path);
    return `
      <button class="gallery-thumb ${i === 0 ? 'is-active' : ''}" data-index="${i}" type="button" aria-label="View photo ${i + 1}">
        <img src="${escapeAttr(url)}" alt="" loading="lazy">
      </button>
    `;
  }).join('');

  return `
    <button class="gallery-main" id="gallery-main-btn" type="button" aria-label="Open full-size photo">
      <img src="${escapeAttr(mainUrl)}" alt="${escapeAttr(title)}" id="gallery-main-img" onerror="handleImgError(this)">
    </button>
    ${images.length > 1 ? `<div class="gallery-thumbs" id="gallery-thumbs">${thumbsHTML}</div>` : ''}
  `;
}

function setupGalleryInteractions(images) {
  if (!images.length) return;
  let current = 0;

  const mainImg = document.getElementById('gallery-main-img');
  const mainBtn = document.getElementById('gallery-main-btn');
  const thumbsWrap = document.getElementById('gallery-thumbs');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  // Fix 1: Ensure lightbox is explicitly hidden on setup
  if (lightbox) {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
  }

  function setActive(index) {
    current = ((index % images.length) + images.length) % images.length;
    const url = resolveImageUrl(images[current].storage_path);
    if (mainImg) mainImg.src = url;
    if (lightboxImg) lightboxImg.src = url;
    thumbsWrap?.querySelectorAll('.gallery-thumb').forEach((el, i) => {
      el.classList.toggle('is-active', i === current);
    });
  }

  thumbsWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('.gallery-thumb');
    if (!btn) return;
    setActive(Number(btn.dataset.index));
  });

  function openLightbox() {
    if (!lightbox) return;
    setActive(current);
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  mainBtn?.addEventListener('click', openLightbox);

  // Fix 2: Delegated click handler on the lightbox element
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.closest('#lightbox-close')) {
      closeLightbox();
    }
  });

  lightboxPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    setActive(current - 1);
  });
  
  lightboxNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    setActive(current + 1);
  });

  // Fix 3: Reliable keyboard listener
  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') setActive(current - 1);
    if (e.key === 'ArrowRight') setActive(current + 1);
  });
}

function renderCar(car) {
  const title = `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}`;
  document.title = `${title} — Roadway Auto`;
  if (breadcrumbEl) breadcrumbEl.textContent = title;

  const images = (car.car_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);

  root.innerHTML = `
    <div class="car-detail">
      <div class="car-detail__gallery">
        ${renderGallery(images, title)}
      </div>
      <div class="car-detail__info">
        ${car.status === 'pending' ? '<span class="detail-badge">Sale Pending</span>' : ''}
        <p class="car-detail__financing-badge">Financing Available</p>
        <h1 class="car-detail__title">${escapeHTML(title)}</h1>
        <p class="car-detail__mileage">${car.mileage ? Number(car.mileage).toLocaleString() + ' miles' : ''}</p>

        <div class="price-panel">
          <div class="price-panel__down">
            <span class="price-panel__down-label">Down Payment</span>
            <span class="price-panel__down-amount">${formatCurrency(car.down_payment)}</span>
          </div>
          <div class="price-panel__row"><span>Full Price</span><span>${formatCurrency(car.full_price)}</span></div>
          ${car.monthly_payment ? `<div class="price-panel__row"><span>Est. Monthly</span><span>${formatCurrency(car.monthly_payment)}/mo</span></div>` : ''}
        </div>

        <div class="car-detail__actions">
          <a href="financing.html?car=${encodeURIComponent(car.id)}" class="btn btn--primary btn--block">Apply for Financing</a>
          <a href="checkout.html?car=${encodeURIComponent(car.id)}" class="btn btn--outline btn--block">Direct Purchase</a>
        </div>
      </div>
    </div>

    <div class="car-detail__specs">
      <h2 class="section__title">Vehicle Details</h2>
      <div class="spec-grid">
        ${specRow('Year', car.year)}
        ${specRow('Make', car.make)}
        ${specRow('Model', car.model)}
        ${specRow('Trim', car.trim_level)}
        ${specRow('Mileage', car.mileage ? Number(car.mileage).toLocaleString() + ' mi' : null)}
        ${specRow('Engine', car.engine)}
        ${specRow('Transmission', car.transmission)}
        ${specRow('Exterior Color', car.exterior_color)}
        ${specRow('Interior Color', car.interior_color)}
        ${specRow('Condition', car.condition)}
        ${specRow('Title Status', car.title_status)}
        ${specRow('VIN', car.vin)}
      </div>
    </div>

    ${renderFeatures(car.features)}
    ${car.description ? `<div class="car-detail__description"><h2 class="section__title">Description</h2><p>${escapeHTML(car.description)}</p></div>` : ''}
  `;

  setupGalleryInteractions(images);
}

async function loadSimilarCars(car) {
  if (!similarRoot) return;

  const baseSelect = 'id, year, make, model, trim_level, full_price, down_payment, monthly_payment, mileage, transmission, status, car_images(storage_path, sort_order)';
  let similar = [];

  if (car.category_id) {
    const { data } = await supabase
      .from('cars')
      .select(baseSelect)
      .eq('status', 'available')
      .eq('category_id', car.category_id)
      .neq('id', car.id)
      .limit(4);
    similar = data || [];
  }

  if (similar.length < 4) {
    const down = Number(car.down_payment) || 0;
    const { data: byPrice } = await supabase
      .from('cars')
      .select(baseSelect)
      .eq('status', 'available')
      .neq('id', car.id)
      .gte('down_payment', down * 0.6)
      .lte('down_payment', down * 1.4)
      .limit(4);

    const existingIds = new Set(similar.map((c) => c.id));
    for (const c of byPrice || []) {
      if (similar.length >= 4) break;
      if (!existingIds.has(c.id)) {
        similar.push(c);
        existingIds.add(c.id);
      }
    }
  }

  if (!similar.length) {
    similarSection?.remove();
    return;
  }

  similarRoot.innerHTML = similar.slice(0, 4).map(carCardHTML).join('');
}

async function init() {
  if (!carId) {
    showNotFound();
    return;
  }

  const { data: car, error } = await supabase
    .from('cars')
    .select('*, car_images(storage_path, sort_order)')
    .eq('id', carId)
    .single();

  if (error || !car) {
    showNotFound();
    return;
  }

  renderCar(car);
  loadSimilarCars(car);
}

init();