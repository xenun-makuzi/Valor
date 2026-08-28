import { supabase } from '../../js/supabase-client.js';
import { escapeHTML, formatCurrency } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';

const tableBody = document.getElementById('table-body');
const formPanel = document.getElementById('form-panel');
const form = document.getElementById('tier-form');
const formTitle = document.getElementById('form-title');

function resetForm() {
  form.reset();
  document.getElementById('tier-id').value = '';
  document.getElementById('active').checked = true;
  formTitle.textContent = 'Add Tier';
}

document.getElementById('add-btn').addEventListener('click', () => {
  resetForm();
  formPanel.hidden = false;
});
document.getElementById('cancel-btn').addEventListener('click', () => { formPanel.hidden = true; });

function rowHTML(tier) {
  return `
    <tr>
      <td>${escapeHTML(tier.label)}</td>
      <td class="mono">${formatCurrency(tier.max_amount)}</td>
      <td>${tier.sort_order}</td>
      <td><span class="status-badge status-badge--${tier.active ? 'active' : 'inactive'}">${tier.active ? 'Active' : 'Inactive'}</span></td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-edit="${tier.id}">Edit</button>
        <button type="button" class="btn btn--outline btn--sm" data-delete="${tier.id}">Delete</button>
      </td>
    </tr>
  `;
}

async function loadTiers() {
  const { data, error } = await supabase.from('down_payment_tiers').select('*').order('sort_order', { ascending: true });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">Couldn't load tiers.</td></tr>`;
    return;
  }
  if (!data.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-table-empty">No tiers yet — add your first one.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(rowHTML).join('');

  tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEdit(data.find((t) => t.id === btn.dataset.edit)));
  });
  tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteTier(btn.dataset.delete));
  });
}

function openEdit(tier) {
  if (!tier) return;
  resetForm();
  document.getElementById('tier-id').value = tier.id;
  document.getElementById('label').value = tier.label;
  document.getElementById('max_amount').value = tier.max_amount;
  document.getElementById('sort_order').value = tier.sort_order;
  document.getElementById('active').checked = tier.active;
  formTitle.textContent = 'Edit Tier';
  formPanel.hidden = false;
}

async function deleteTier(id) {
  if (!confirm('Delete this down payment tier? It will disappear from the homepage and inventory filters immediately.')) return;

  const { error } = await supabase.from('down_payment_tiers').delete().eq('id', id);
  if (error) {
    showToast("Couldn't delete this tier.", true);
    return;
  }
  showToast('Tier deleted.');
  loadTiers();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('tier-id').value;
  const payload = {
    label: document.getElementById('label').value.trim(),
    max_amount: Number(document.getElementById('max_amount').value) || 0,
    sort_order: Number(document.getElementById('sort_order').value) || 0,
    active: document.getElementById('active').checked,
  };

  const { error } = id
    ? await supabase.from('down_payment_tiers').update(payload).eq('id', id)
    : await supabase.from('down_payment_tiers').insert(payload);

  if (error) {
    showToast("Couldn't save this tier.", true);
    return;
  }

  showToast('Tier saved.');
  formPanel.hidden = true;
  loadTiers();
});

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'tiers.html');
  loadTiers();
}

init();