import { supabase } from './supabase-client.js';
import { escapeHTML, escapeAttr, formatCurrency, carCardHTML } from './utils.js';

const root = document.getElementById('sections-root');

// Shared icon set for trust badges + why-choose-us cards
const ICONS = {
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/>',
  headset: '<path d="M3 13a9 9 0 0 1 18 0"/><path d="M21 13v4a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3z"/><path d="M3 13v4a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H3z"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="16.5" cy="13" r="1.4"/>',
  percent: '<circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/><line x1="19" y1="5" x2="5" y2="19"/>',
};
const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

// ============================================================
// SECTION RENDERERS
// ============================================================
function renderHero(section, tiers) {
  const cfg = section.config || {};
  const rotations = [-4, 2, -2];
  const tagsHTML = tiers.slice(0, 3).map((t, i) => `
    <a href="inventory.html?maxDown=${encodeURIComponent(t.max_amount)}" class="tag-card"
       style="--rotate:${rotations[i] ?? 0}deg; --delay:${i * 0.12}s"
       aria-label="Shop cars with ${formatCurrency(t.max_amount)} or less down">
      <span class="tag-card__hole"></span>
      <span class="tag-card__amount">${formatCurrency(t.max_amount)}</span>
      <span class="tag-card__label">down</span>
    </a>
  `).join('');

  return `
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__content">
          <h1 class="hero__headline">${escapeHTML(section.title) || 'Own it for less down.'}</h1>
          <p class="hero__subhead">${escapeHTML(cfg.subtext) || 'Financing available on every vehicle on our lot — pick a down payment that fits and drive away today.'}</p>
          <div class="hero__actions">
            <a href="inventory.html" class="btn btn--primary">Browse Inventory</a>
            <a href="financing.html" class="btn btn--outline">Get Pre-Qualified</a>
          </div>
        </div>
        <div class="hero__tags">${tagsHTML}</div>
      </div>
    </section>
  `;
}

function renderTrustBadges(section) {
  const cfg = section.config || {};
  const badges = Array.isArray(cfg.badges) && cfg.badges.length ? cfg.badges : [
    { icon: 'shield', text: 'Secure & Confidential' },
    { icon: 'card', text: 'Financing Available' },
    { icon: 'check', text: 'Clean Titles Only' },
    { icon: 'headset', text: 'Real Support, Real People' },
  ];
  const itemsHTML = badges.map((b) => `
    <div class="trust-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[b.icon] || ICONS.check}</svg>
      <span>${escapeHTML(b.text)}</span>
    </div>
  `).join('');

  return `<section class="trust-strip"><div class="container trust-strip__row">${itemsHTML}</div></section>`;
}

function renderWhyChooseUs(section) {
  const cfg = section.config || {};
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  if (!items.length) return '';

  const cardsHTML = items.map((item) => `
    <div class="why-card">
      <div class="why-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[item.icon] || ICONS.check}</svg>
      </div>
      <h3 class="why-card__title">${escapeHTML(item.title || '')}</h3>
      <p class="why-card__desc">${escapeHTML(item.description || '')}</p>
    </div>
  `).join('');

  return `
    <section class="section section--muted">
      <div class="container">
        <div class="section-head"><h2 class="section__title">${escapeHTML(section.title) || 'Why Choose Us'}</h2></div>
        <div class="why-grid">${cardsHTML}</div>
      </div>
    </section>
  `;
}

function renderAbout(section) {
  const cfg = section.config || {};
  if (!cfg.quote) return '';
  return `
    <section class="section about-section">
      <div class="container about-section__inner">
        <h2 class="section__title">${escapeHTML(section.title) || 'Meet the Team'}</h2>
        <p class="about-section__quote">${escapeHTML(cfg.quote)}</p>
        <p class="about-section__name">— ${escapeHTML(cfg.name || '')}${cfg.role ? ', ' + escapeHTML(cfg.role) : ''}</p>
      </div>
    </section>
  `;
}

function renderDownPaymentGrid(section, tiers) {
  if (!tiers.length) return '';
  const cardsHTML = tiers.map((t, i) => `
    <a href="inventory.html?maxDown=${encodeURIComponent(t.max_amount)}" class="tag-card" style="--rotate:${i % 2 === 0 ? -2 : 2.2}deg">
      <span class="tag-card__hole"></span>
      <span class="tag-card__amount">${formatCurrency(t.max_amount)}</span>
      <span class="tag-card__label">or less down</span>
    </a>
  `).join('');

  return `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2 class="section__title">${escapeHTML(section.title) || 'Shop by Down Payment'}</h2>
          <p class="section__subtitle">Pick a down payment that fits your budget — every vehicle below qualifies for financing.</p>
        </div>
        <div class="tier-grid">${cardsHTML}</div>
      </div>
    </section>
  `;
}

async function renderFeaturedCars(section) {
  const cfg = section.config || {};
  const limit = cfg.limit || 8;

  const { data: cars, error } = await supabase
    .from('cars')
    .select('id, year, make, model, trim_level, full_price, down_payment, monthly_payment, mileage, transmission, status, featured, sort_order, car_images(storage_path, sort_order)')
    .eq('status', 'available')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error loading featured cars:', error);
    return '';
  }

  const body = cars && cars.length
    ? `<div class="car-grid">${cars.map(carCardHTML).join('')}</div>`
    : `<div class="empty-state"><strong>New inventory arriving soon</strong>Check back shortly, or apply for financing now to be first in line.</div>`;

  return `
    <section class="section section--muted">
      <div class="container">
        <div class="section-head">
          <h2 class="section__title">${escapeHTML(section.title) || 'Featured Vehicles'}</h2>
          <p class="section__subtitle">A few of the vehicles currently on the lot.</p>
        </div>
        ${body}
      </div>
    </section>
  `;
}

async function renderCategoryCarousel(section) {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !categories || !categories.length) return '';

  const chipsHTML = categories.map((c) => `<a href="inventory.html?category=${encodeURIComponent(c.slug)}" class="category-chip">${escapeHTML(c.name)}</a>`).join('');

  return `
    <section class="section">
      <div class="container">
        <div class="section-head"><h2 class="section__title">${escapeHTML(section.title) || 'Browse by Category'}</h2></div>
        <div class="category-scroll">${chipsHTML}</div>
      </div>
    </section>
  `;
}

function renderTestimonials(section) {
  const cfg = section.config || {};
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  if (!items.length) return ''; // No placeholder reviews — only render real, admin-entered ones.

  const cardsHTML = items.map((t) => `
    <div class="testimonial-card">
      <p>“${escapeHTML(t.quote || '')}”</p>
      <cite>${escapeHTML(t.author || 'Verified Customer')}</cite>
    </div>
  `).join('');

  return `
    <section class="section">
      <div class="container">
        <div class="section-head"><h2 class="section__title">${escapeHTML(section.title) || 'What Our Customers Say'}</h2></div>
        <div class="testimonial-scroll">${cardsHTML}</div>
      </div>
    </section>
  `;
}

function renderVideoReviews(section) {
  const cfg = section.config || {};
  const rawVideos = Array.isArray(cfg.videos) ? cfg.videos : [];
  const slots = [0, 1, 2, 3].map((i) => rawVideos[i] || null);

  const cardsHTML = slots.map((v) => {
    if (v && v.url) {
      const thumb = v.thumbnail
        ? `<img src="${escapeAttr(v.thumbnail)}" alt="" loading="lazy">`
        : '';
      return `
        <a href="${escapeAttr(v.url)}" target="_blank" rel="noopener" class="video-card">
          <div class="video-card__thumb">
            ${thumb}
            <span class="video-card__play">${PLAY_ICON}</span>
          </div>
          <p class="video-card__caption">${escapeHTML(v.caption || 'Watch the video')}</p>
        </a>
      `;
    }
    return `
      <div class="video-card video-card--empty">
        <div class="video-card__thumb"><span class="video-card__play">${PLAY_ICON}</span></div>
        <p class="video-card__caption">Video coming soon</p>
      </div>
    `;
  }).join('');

  return `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2 class="section__title">${escapeHTML(section.title) || 'Recent Deliveries'}</h2>
          <p class="section__subtitle">A look at some of our most recent drive-aways.</p>
        </div>
        <div class="video-grid">${cardsHTML}</div>
      </div>
    </section>
  `;
}

function renderFaq(section) {
  const cfg = section.config || {};
  const items = Array.isArray(cfg.items) ? cfg.items : [];
  if (!items.length) return '';

  const itemsHTML = items.map((item) => `
    <details class="faq-item">
      <summary class="faq-item__question">${escapeHTML(item.question || '')}</summary>
      <div class="faq-item__answer">${escapeHTML(item.answer || '')}</div>
    </details>
  `).join('');

  return `
    <section class="section section--muted">
      <div class="container">
        <div class="section-head"><h2 class="section__title">${escapeHTML(section.title) || 'Frequently Asked Questions'}</h2></div>
        <div class="faq-list">${itemsHTML}</div>
      </div>
    </section>
  `;
}

function renderCtaBanner(section) {
  const cfg = section.config || {};
  const href = escapeAttr(cfg.href || 'financing.html');
  return `
    <section class="section cta-banner">
      <div class="container cta-banner__inner">
        <h2>${escapeHTML(section.title) || escapeHTML(cfg.headline) || 'Ready to find your next car?'}</h2>
        <p>${escapeHTML(cfg.subtext) || "Get pre-qualified in minutes and see what you're approved for before you visit."}</p>
        <a href="${href}" class="btn btn--primary">${escapeHTML(cfg.button_text) || 'Get Pre-Qualified'}</a>
      </div>
    </section>
  `;
}

// ============================================================
// ORCHESTRATION
// ============================================================
async function init() {
  const [{ data: sections, error: sectionsError }, { data: tiers }] = await Promise.all([
    supabase.from('sections').select('*').eq('visible', true).order('sort_order', { ascending: true }),
    supabase.from('down_payment_tiers').select('*').eq('active', true).order('sort_order', { ascending: true }),
  ]);

  if (sectionsError) {
    console.error('Error loading homepage sections:', sectionsError);
    root.innerHTML = `<div class="container"><div class="empty-state"><strong>Unable to load this page</strong>Check your Supabase URL/key in js/supabase-client.js, then refresh.</div></div>`;
    return;
  }

  const tierList = tiers || [];
  const blocks = [];

  for (const section of sections || []) {
    switch (section.type) {
      case 'hero':
        blocks.push(renderHero(section, tierList));
        break;
      case 'trust_badges':
        blocks.push(renderTrustBadges(section));
        break;
      case 'why_choose_us':
        blocks.push(renderWhyChooseUs(section));
        break;
      case 'about':
        blocks.push(renderAbout(section));
        break;
      case 'down_payment_grid':
        blocks.push(renderDownPaymentGrid(section, tierList));
        break;
      case 'featured_cars':
        blocks.push(await renderFeaturedCars(section));
        break;
      case 'category_carousel':
        blocks.push(await renderCategoryCarousel(section));
        break;
      case 'testimonials':
        blocks.push(renderTestimonials(section));
        break;
      case 'video_reviews':
        blocks.push(renderVideoReviews(section));
        break;
      case 'faq':
        blocks.push(renderFaq(section));
        break;
      case 'cta_banner':
        blocks.push(renderCtaBanner(section));
        break;
      default:
        console.warn(`No renderer yet for section type "${section.type}" — skipping.`);
    }
  }

  root.innerHTML = blocks.filter(Boolean).join('');
}

init();