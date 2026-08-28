import { supabase } from '../../js/supabase-client.js';
import { escapeHTML } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';

const tableBody = document.getElementById('table-body');
const formPanel = document.getElementById('form-panel');
const form = document.getElementById('method-form');
const formTitle = document.getElementById('form-title');

function resetForm() {
  form.reset();
  document.getElementById('method-id').value = '';
  document.getElementById('active').checked = false;
  formTitle.textContent = 'Add Payment Method';
}

document.getElementById('add-btn').addEventListener('click', () => {
  resetForm();
  formPanel.hidden = false;
});
document.getElementById('cancel-btn').addEventListener('click', () => { formPanel.hidden = true; });

function rowHTML(pm) {
  return `
    <tr>
      <td>${escapeHTML(pm.name)}</td>
      <td>${escapeHTML(pm.type)}</td>
      <td>${pm.sort_order}</td>
      <td><span class="status-badge status-badge--${pm.active ? 'active' : 'inactive'}">${pm.active ? 'Active' : 'Inactive'}</span></td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-edit="${pm.id}">Edit</button>
        <button type="button" class="btn btn--outline btn--sm" data-delete="${pm.id}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadMethods() {
  const { data, error } = await supabase.from('payment_methods').select('*').order('sort_order', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">Couldn't load payment methods.</td></tr>`;
    return;
  }
  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">No payment methods yet — add your first one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(rowHTML).join('');

  tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(data.find((p) => p.id === btn.dataset.edit)));
  });
  tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteMethod(btn.dataset.delete));
  });
}

function openEdit(pm) {
  if (!pm) return;
  resetForm();
  document.getElementById('method-id').value = pm.id;
  document.getElementById('name').value = pm.name;
  document.getElementById('type').value = pm.type;
  document.getElementById('notes').value = (pm.config && pm.config.notes) || '';
  document.getElementById('sort_order').value = pm.sort_order;
  document.getElementById('active').checked = pm.active;
  formTitle.textContent = 'Edit Payment Method';
  formPanel.hidden = false;
}

async function deleteMethod(id) {
  if (!confirm('Delete this payment method? It will disappear from checkout immediately. Existing orders that used it are not affected.')) return;

  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) {
    showToast("Couldn't delete this payment method.", true);
    return;
  }
  showToast('Payment method deleted.');
  loadMethods();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('method-id').value;
  const notes = document.getElementById('notes').value.trim();
  const payload = {
    name: document.getElementById('name').value.trim(),
    type: document.getElementById('type').value,
    config: notes ? { notes } : {},
    sort_order: Number(document.getElementById('sort_order').value) || 0,
    active: document.getElementById('active').checked,
  };

  const { error } = id
    ? await supabase.from('payment_methods').update(payload).eq('id', id)
    : await supabase.from('payment_methods').insert(payload);

  if (error) {
    showToast("Couldn't save this payment method.", true);
    return;
  }

  showToast('Payment method saved.');
  formPanel.hidden = true;
  loadMethods();
});

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'payment-methods.html');
  loadMethods();
}

init();