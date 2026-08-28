import { supabase } from '../../js/supabase-client.js';
import { escapeHTML, slugify } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';

const tableBody = document.getElementById('table-body');
const formPanel = document.getElementById('form-panel');
const form = document.getElementById('category-form');
const formTitle = document.getElementById('form-title');

let slugManuallyEdited = false;

document.getElementById('slug').addEventListener('input', () => { slugManuallyEdited = true; });
document.getElementById('name').addEventListener('input', (e) => {
  if (!slugManuallyEdited) document.getElementById('slug').value = slugify(e.target.value);
});

function resetForm() {
  form.reset();
  document.getElementById('category-id').value = '';
  document.getElementById('active').checked = true;
  slugManuallyEdited = false;
  formTitle.textContent = 'Add Category';
}

document.getElementById('add-btn').addEventListener('click', () => {
  resetForm();
  formPanel.hidden = false;
});
document.getElementById('cancel-btn').addEventListener('click', () => { formPanel.hidden = true; });

function rowHTML(cat) {
  return `
    <tr>
      <td>${escapeHTML(cat.name)}</td>
      <td class="mono">${escapeHTML(cat.slug)}</td>
      <td>${cat.sort_order}</td>
      <td><span class="status-badge status-badge--${cat.active ? 'active' : 'inactive'}">${cat.active ? 'Active' : 'Inactive'}</span></td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-edit="${cat.id}">Edit</button>
        <button type="button" class="btn btn--outline btn--sm" data-delete="${cat.id}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">Couldn't load categories.</td></tr>`;
    return;
  }
  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">No categories yet — add your first one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(rowHTML).join('');

  tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(data.find((c) => c.id === btn.dataset.edit)));
  });
  tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.delete));
  });
}

function openEdit(cat) {
  if (!cat) return;
  resetForm();
  document.getElementById('category-id').value = cat.id;
  document.getElementById('name').value = cat.name;
  document.getElementById('slug').value = cat.slug;
  document.getElementById('sort_order').value = cat.sort_order;
  document.getElementById('active').checked = cat.active;
  slugManuallyEdited = true; // don't overwrite an existing slug while editing
  formTitle.textContent = 'Edit Category';
  formPanel.hidden = false;
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Cars in this category will keep showing but without a category filter tag.')) return;

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    showToast("Couldn't delete this category.", true);
    return;
  }
  showToast('Category deleted.');
  loadCategories();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('category-id').value;
  const payload = {
    name: document.getElementById('name').value.trim(),
    slug: document.getElementById('slug').value.trim(),
    sort_order: Number(document.getElementById('sort_order').value) || 0,
    active: document.getElementById('active').checked,
  };

  const { error } = id
    ? await supabase.from('categories').update(payload).eq('id', id)
    : await supabase.from('categories').insert(payload);

  if (error) {
    showToast(error.code === '23505' ? 'That slug is already in use.' : "Couldn't save this category.", true);
    return;
  }

  showToast('Category saved.');
  formPanel.hidden = true;
  loadCategories();
});

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'categories.html');
  loadCategories();
}

init();