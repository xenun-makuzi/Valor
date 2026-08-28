import { supabase, resolveImageUrl, CAR_IMAGES_BUCKET } from '../../js/supabase-client.js';
import { escapeHTML, escapeAttr, formatCurrency, slugify } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';

const tableBody = document.getElementById('table-body');
const formPanel = document.getElementById('form-panel');
const form = document.getElementById('car-form');
const formTitle = document.getElementById('form-title');
const errorEl = document.getElementById('form-error');

let categories = [];
let carsCache = [];
let slugManuallyEdited = false;

/* ---------------- slug auto-suggestion ---------------- */
function suggestSlug() {
  const year = document.getElementById('year').value;
  const make = document.getElementById('make').value;
  const model = document.getElementById('model').value;
  const trim = document.getElementById('trim_level').value;
  return slugify([year, make, model, trim].filter(Boolean).join(' '));
}
['year', 'make', 'model', 'trim_level'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => {
    if (!slugManuallyEdited) document.getElementById('slug').value = suggestSlug();
  });
});
document.getElementById('slug').addEventListener('input', () => { slugManuallyEdited = true; });

/* ---------------- features <-> textarea ---------------- */
function featuresToText(features) {
  return Array.isArray(features) ? features.join('\n') : '';
}
function textToFeatures(text) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

/* ---------------- image manager ---------------- */
function renderImageManager(carId, images) {
  const container = document.getElementById('image-manager-content');

  if (!carId) {
    container.innerHTML = `<p class="form-note">Save this car first — then you can add photos.</p>`;
    return;
  }

  const sorted = (images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const gridHTML = sorted.length
    ? sorted.map((img) => `
        <div class="image-manager__item">
          <img src="${escapeAttr(resolveImageUrl(img.storage_path))}" alt="">
          <button type="button" class="image-manager__remove" data-image-id="${img.id}" data-storage-path="${escapeAttr(img.storage_path)}" aria-label="Remove photo">✕</button>
        </div>
      `).join('')
    : `<div class="image-manager__empty">No photos yet</div>`;

  container.innerHTML = `
    <div class="image-manager__grid">${gridHTML}</div>
    <div class="form-field">
      <label for="photo-upload">Add Photos</label>
      <input type="file" id="photo-upload" accept="image/*" multiple>
    </div>
  `;

  container.querySelectorAll('.image-manager__remove').forEach((btn) => {
    btn.addEventListener('click', () => deleteImage(carId, btn.dataset.imageId, btn.dataset.storagePath));
  });

  document.getElementById('photo-upload')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) await uploadImages(carId, files);
    e.target.value = '';
  });
}

async function refreshImages(carId) {
  const { data } = await supabase.from('car_images').select('*').eq('car_id', carId);
  renderImageManager(carId, data || []);
}

async function uploadImages(carId, files) {
  showToast(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`);

  const { data: existing } = await supabase
    .from('car_images')
    .select('sort_order')
    .eq('car_id', carId)
    .order('sort_order', { ascending: false })
    .limit(1);
  let nextSort = existing && existing.length ? existing[0].sort_order + 1 : 0;

  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${carId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(CAR_IMAGES_BUCKET).upload(path, file);
    if (uploadError) {
      showToast(`Couldn't upload ${file.name}: ${uploadError.message}`, true);
      continue;
    }

    const { error: insertError } = await supabase
      .from('car_images')
      .insert({ car_id: carId, storage_path: path, sort_order: nextSort });
    if (insertError) {
      showToast(`Uploaded but couldn't save ${file.name} to this car.`, true);
      continue;
    }
    nextSort += 1;
  }

  showToast('Photos updated.');
  refreshImages(carId);
  loadCars();
}

async function deleteImage(carId, imageId, storagePath) {
  if (!confirm('Delete this photo?')) return;

  await supabase.storage.from(CAR_IMAGES_BUCKET).remove([storagePath]);
  const { error } = await supabase.from('car_images').delete().eq('id', imageId);

  if (error) {
    showToast("Couldn't delete this photo.", true);
    return;
  }
  showToast('Photo deleted.');
  refreshImages(carId);
  loadCars();
}

/* ---------------- form reset / open ---------------- */
function resetForm() {
  form.reset();
  document.getElementById('car-id').value = '';
  document.getElementById('title_status').value = 'Clean title';
  document.getElementById('status').value = 'available';
  document.getElementById('sort_order').value = '0';
  slugManuallyEdited = false;
  errorEl.hidden = true;
  formTitle.textContent = 'Add Car';
  renderImageManager(null, []);
}

document.getElementById('add-btn').addEventListener('click', () => {
  resetForm();
  formPanel.hidden = false;
});
document.getElementById('cancel-btn').addEventListener('click', () => { formPanel.hidden = true; });

function openEdit(car) {
  if (!car) return;
  resetForm();
  document.getElementById('car-id').value = car.id;
  document.getElementById('category_id').value = car.category_id || '';
  document.getElementById('year').value = car.year;
  document.getElementById('make').value = car.make;
  document.getElementById('model').value = car.model;
  document.getElementById('trim_level').value = car.trim_level || '';
  document.getElementById('vin').value = car.vin || '';
  document.getElementById('slug').value = car.slug || '';
  document.getElementById('full_price').value = car.full_price;
  document.getElementById('down_payment').value = car.down_payment;
  document.getElementById('monthly_payment').value = car.monthly_payment ?? '';
  document.getElementById('mileage').value = car.mileage ?? '';
  document.getElementById('title_status').value = car.title_status || '';
  document.getElementById('exterior_color').value = car.exterior_color || '';
  document.getElementById('interior_color').value = car.interior_color || '';
  document.getElementById('engine').value = car.engine || '';
  document.getElementById('transmission').value = car.transmission || '';
  document.getElementById('condition').value = car.condition || '';
  document.getElementById('features').value = featuresToText(car.features);
  document.getElementById('description').value = car.description || '';
  document.getElementById('status').value = car.status;
  document.getElementById('sort_order').value = car.sort_order;
  document.getElementById('featured').checked = car.featured;
  slugManuallyEdited = true;

  formTitle.textContent = 'Edit Car';
  formPanel.hidden = false;
  renderImageManager(car.id, car.car_images || []);
}

/* ---------------- list ---------------- */
function rowHTML(car) {
  const title = `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}`;
  const images = (car.car_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const thumbUrl = images.length ? resolveImageUrl(images[0].storage_path) : null;

  return `
    <tr>
      <td><div class="admin-table__thumb">${thumbUrl ? `<img src="${escapeAttr(thumbUrl)}" alt="">` : ''}</div></td>
      <td>${escapeHTML(title)}</td>
      <td>${escapeHTML(car.categories?.name || '—')}</td>
      <td class="mono">${formatCurrency(car.down_payment)} dn / ${formatCurrency(car.full_price)}</td>
      <td><span class="status-badge status-badge--${car.status}">${escapeHTML(car.status)}</span></td>
      <td>${car.featured ? 'Yes' : '—'}</td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-edit="${car.id}">Edit</button>
        <button type="button" class="btn btn--outline btn--sm" data-delete="${car.id}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadCategories() {
  const { data } = await supabase.from('categories').select('id, name').order('sort_order', { ascending: true });
  categories = data || [];
  const select = document.getElementById('category_id');
  select.innerHTML = '<option value="">— None —</option>' +
    categories.map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
}

async function loadCars() {
  const { data, error } = await supabase
    .from('cars')
    .select('*, categories(name), car_images(id, storage_path, sort_order)')
    .order('sort_order', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">Couldn't load cars.</td></tr>`;
    return;
  }
  carsCache = data || [];
  if (!carsCache.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No cars yet — add your first one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = carsCache.map(rowHTML).join('');

  tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(carsCache.find((c) => c.id === btn.dataset.edit)));
  });
  tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteCar(btn.dataset.delete));
  });
}

async function deleteCar(id) {
  if (!confirm('Delete this car? This also permanently removes its photos. This cannot be undone.')) return;

  const { data: images } = await supabase.from('car_images').select('storage_path').eq('car_id', id);
  if (images && images.length) {
    await supabase.storage.from(CAR_IMAGES_BUCKET).remove(images.map((i) => i.storage_path));
  }

  const { error } = await supabase.from('cars').delete().eq('id', id);
  if (error) {
    showToast("Couldn't delete this car.", true);
    return;
  }
  showToast('Car deleted.');
  loadCars();
}

/* ---------------- save ---------------- */
function readForm() {
  return {
    category_id: document.getElementById('category_id').value || null,
    slug: document.getElementById('slug').value.trim(),
    year: Number(document.getElementById('year').value),
    make: document.getElementById('make').value.trim(),
    model: document.getElementById('model').value.trim(),
    trim_level: document.getElementById('trim_level').value.trim() || null,
    vin: document.getElementById('vin').value.trim() || null,
    full_price: Number(document.getElementById('full_price').value) || 0,
    down_payment: Number(document.getElementById('down_payment').value) || 0,
    monthly_payment: document.getElementById('monthly_payment').value ? Number(document.getElementById('monthly_payment').value) : null,
    mileage: document.getElementById('mileage').value ? Number(document.getElementById('mileage').value) : null,
    exterior_color: document.getElementById('exterior_color').value.trim() || null,
    interior_color: document.getElementById('interior_color').value.trim() || null,
    engine: document.getElementById('engine').value.trim() || null,
    transmission: document.getElementById('transmission').value.trim() || null,
    condition: document.getElementById('condition').value.trim() || null,
    title_status: document.getElementById('title_status').value.trim() || null,
    features: textToFeatures(document.getElementById('features').value),
    description: document.getElementById('description').value.trim() || null,
    status: document.getElementById('status').value,
    featured: document.getElementById('featured').checked,
    sort_order: Number(document.getElementById('sort_order').value) || 0,
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const id = document.getElementById('car-id').value;
  const payload = readForm();

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  if (id) {
    const { error } = await supabase.from('cars').update(payload).eq('id', id);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Car';

    if (error) {
      errorEl.textContent = error.code === '23505' ? 'That URL slug is already used by another car.' : "Couldn't save this car.";
      errorEl.hidden = false;
      return;
    }
    showToast('Car saved.');
    loadCars();
    return;
  }

  const { data: inserted, error } = await supabase
    .from('cars')
    .insert(payload)
    .select('id, car_images(id, storage_path, sort_order)')
    .single();

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Car';

  if (error) {
    errorEl.textContent = error.code === '23505' ? 'That URL slug is already used by another car.' : "Couldn't save this car.";
    errorEl.hidden = false;
    return;
  }

  // Stay open, now in edit mode with a real ID, so photos can go on immediately.
  document.getElementById('car-id').value = inserted.id;
  formTitle.textContent = 'Edit Car';
  renderImageManager(inserted.id, inserted.car_images || []);
  showToast('Car saved — add some photos below.');
  loadCars();
});

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'cars.html');
  await loadCategories();
  await loadCars();
  renderImageManager(null, []);
}

init();