import { supabase } from '../../js/supabase-client.js';
import { escapeHTML } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';
import { createRepeater } from './repeater.js';

const tableBody = document.getElementById('table-body');
const formPanel = document.getElementById('form-panel');
const form = document.getElementById('section-form');
const formTitle = document.getElementById('form-title');
const errorEl = document.getElementById('form-error');
const typeSelect = document.getElementById('type');
const typeLockedNote = document.getElementById('type-locked-note');

const ICON_OPTIONS = [
  { value: 'shield', label: 'Shield' },
  { value: 'card', label: 'Card' },
  { value: 'check', label: 'Check' },
  { value: 'headset', label: 'Headset' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'percent', label: 'Percent' },
];
const BADGE_FIELDS = [
  { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS },
  { key: 'text', label: 'Text', type: 'text' },
];
const WHY_FIELDS = [
  { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
];
const TESTIMONIAL_FIELDS = [
  { key: 'quote', label: 'Quote', type: 'textarea' },
  { key: 'author', label: 'Author', type: 'text' },
];
const VIDEO_FIELDS = [
  { key: 'url', label: 'Video URL', type: 'text' },
  { key: 'thumbnail', label: 'Thumbnail Image URL', type: 'text' },
  { key: 'caption', label: 'Caption', type: 'text' },
];
const FAQ_FIELDS = [
  { key: 'question', label: 'Question', type: 'text' },
  { key: 'answer', label: 'Answer', type: 'textarea' },
];

let sectionsCache = [];
let badgesRepeater, whyRepeater, testimonialsRepeater, videosRepeater, faqRepeater;

/* ---------------- config panel show/hide ---------------- */
function showConfigPanel(type) {
  document.querySelectorAll('.config-panel').forEach((panel) => {
    panel.hidden = panel.dataset.configFor !== type;
  });
}
typeSelect.addEventListener('change', (e) => showConfigPanel(e.target.value));

document.getElementById('add-badge').addEventListener('click', () => badgesRepeater.addEmptyRow());
document.getElementById('add-why-item').addEventListener('click', () => whyRepeater.addEmptyRow());
document.getElementById('add-testimonial').addEventListener('click', () => testimonialsRepeater.addEmptyRow());
document.getElementById('add-video').addEventListener('click', () => videosRepeater.addEmptyRow());
document.getElementById('add-faq').addEventListener('click', () => faqRepeater.addEmptyRow());

function loadConfigIntoForm(config) {
  config = config || {};
  document.getElementById('cfg-hero-subtext').value = config.subtext || '';
  document.getElementById('cfg-about-quote').value = config.quote || '';
  document.getElementById('cfg-about-name').value = config.name || '';
  document.getElementById('cfg-about-role').value = config.role || '';
  document.getElementById('cfg-featured-limit').value = config.limit || 8;
  document.getElementById('cfg-cta-subtext').value = config.subtext || '';
  document.getElementById('cfg-cta-button-text').value = config.button_text || '';
  document.getElementById('cfg-cta-href').value = config.href || '';

  badgesRepeater = createRepeater(document.getElementById('badges-repeater'), BADGE_FIELDS, config.badges || []);
  whyRepeater = createRepeater(document.getElementById('why-repeater'), WHY_FIELDS, config.items || []);
  testimonialsRepeater = createRepeater(document.getElementById('testimonials-repeater'), TESTIMONIAL_FIELDS, config.items || []);
  videosRepeater = createRepeater(document.getElementById('videos-repeater'), VIDEO_FIELDS, config.videos || []);
  faqRepeater = createRepeater(document.getElementById('faq-repeater'), FAQ_FIELDS, config.items || []);
}

function readConfigFromForm(type) {
  switch (type) {
    case 'hero':
      return { subtext: document.getElementById('cfg-hero-subtext').value.trim() };
    case 'trust_badges':
      return { badges: badgesRepeater.getValues() };
    case 'why_choose_us':
      return { items: whyRepeater.getValues() };
    case 'about':
      return {
        quote: document.getElementById('cfg-about-quote').value.trim(),
        name: document.getElementById('cfg-about-name').value.trim(),
        role: document.getElementById('cfg-about-role').value.trim() || undefined,
      };
    case 'featured_cars':
      return { limit: Number(document.getElementById('cfg-featured-limit').value) || 8 };
    case 'testimonials':
      return { items: testimonialsRepeater.getValues() };
    case 'video_reviews':
      return { videos: videosRepeater.getValues() };
    case 'faq':
      return { items: faqRepeater.getValues() };
    case 'cta_banner':
      return {
        subtext: document.getElementById('cfg-cta-subtext').value.trim(),
        button_text: document.getElementById('cfg-cta-button-text').value.trim(),
        href: document.getElementById('cfg-cta-href').value.trim(),
      };
    default:
      return {};
  }
}

/* ---------------- form open/reset ---------------- */
function resetForm() {
  form.reset();
  document.getElementById('section-id').value = '';
  document.getElementById('visible').checked = true;
  document.getElementById('sort_order').value = '0';
  errorEl.hidden = true;
  typeSelect.disabled = false;
  typeLockedNote.hidden = true;
  formTitle.textContent = 'Add Section';
  loadConfigIntoForm({});
  showConfigPanel(typeSelect.value);
}

document.getElementById('add-btn').addEventListener('click', () => {
  resetForm();
  formPanel.hidden = false;
});
document.getElementById('cancel-btn').addEventListener('click', () => { formPanel.hidden = true; });

function openEdit(section) {
  if (!section) return;
  resetForm();
  document.getElementById('section-id').value = section.id;
  document.getElementById('title').value = section.title || '';
  document.getElementById('sort_order').value = section.sort_order;
  document.getElementById('visible').checked = section.visible;
  typeSelect.value = section.type;
  typeSelect.disabled = true;
  typeLockedNote.hidden = false;

  loadConfigIntoForm(section.config);
  showConfigPanel(section.type);

  formTitle.textContent = 'Edit Section';
  formPanel.hidden = false;
}

/* ---------------- list ---------------- */
const TYPE_LABELS = {
  hero: 'Hero', trust_badges: 'Trust Badges', why_choose_us: 'Why Choose Us', about: 'About',
  down_payment_grid: 'Down Payment Grid', featured_cars: 'Featured Cars', category_carousel: 'Category Carousel',
  testimonials: 'Testimonials', video_reviews: 'Video Reviews', faq: 'FAQ', cta_banner: 'CTA Banner',
};

function rowHTML(section) {
  return `
    <tr>
      <td>${escapeHTML(TYPE_LABELS[section.type] || section.type)}</td>
      <td>${escapeHTML(section.title || '—')}</td>
      <td>${section.sort_order}</td>
      <td>
        <button type="button" class="status-badge status-badge--${section.visible ? 'active' : 'inactive'}" style="border:none; cursor:pointer;" data-toggle-visible="${section.id}">
          ${section.visible ? 'Visible' : 'Hidden'}
        </button>
      </td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-edit="${section.id}">Edit</button>
        <button type="button" class="btn btn--outline btn--sm" data-delete="${section.id}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadSections() {
  const { data, error } = await supabase.from('sections').select('*').order('sort_order', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">Couldn't load sections.</td></tr>`;
    return;
  }
  sectionsCache = data || [];
  if (!sectionsCache.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">No sections yet — add your first one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = sectionsCache.map(rowHTML).join('');

  tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(sectionsCache.find((s) => s.id === btn.dataset.edit)));
  });
  tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteSection(btn.dataset.delete));
  });
  tableBody.querySelectorAll('[data-toggle-visible]').forEach((btn) => {
    btn.addEventListener('click', () => toggleVisible(btn.dataset.toggleVisible));
  });
}

async function toggleVisible(id) {
  const section = sectionsCache.find((s) => s.id === id);
  if (!section) return;

  const { error } = await supabase.from('sections').update({ visible: !section.visible }).eq('id', id);
  if (error) {
    showToast("Couldn't update visibility.", true);
    return;
  }
  loadSections();
}

async function deleteSection(id) {
  if (!confirm('Delete this section? It will disappear from the homepage immediately.')) return;

  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) {
    showToast("Couldn't delete this section.", true);
    return;
  }
  showToast('Section deleted.');
  loadSections();
}

/* ---------------- save ---------------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const id = document.getElementById('section-id').value;
  const type = typeSelect.value;

  const payload = {
    title: document.getElementById('title').value.trim() || null,
    sort_order: Number(document.getElementById('sort_order').value) || 0,
    visible: document.getElementById('visible').checked,
    config: readConfigFromForm(type),
  };
  if (!id) payload.type = type;

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  const { error } = id
    ? await supabase.from('sections').update(payload).eq('id', id)
    : await supabase.from('sections').insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Section';

  if (error) {
    errorEl.textContent = "Couldn't save this section.";
    errorEl.hidden = false;
    return;
  }

  showToast('Section saved.');
  formPanel.hidden = true;
  loadSections();
});

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'sections.html');
  resetForm();
  loadSections();
}

init();