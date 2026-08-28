import { supabase } from '../../js/supabase-client.js';
import { escapeHTML, formatCurrency } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';

const tableBody = document.getElementById('table-body');
const detailPanel = document.getElementById('detail-panel');
const statusFilter = document.getElementById('status-filter');

let appsCache = [];
let currentApp = null;

function carTitle(app) {
  const car = app.cars;
  return car ? `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}` : 'General pre-qualification';
}

function rowHTML(app) {
  const submitted = new Date(app.created_at).toLocaleDateString();
  return `
    <tr>
      <td class="mono">${escapeHTML(app.application_code)}</td>
      <td>${escapeHTML(carTitle(app))}</td>
      <td>${escapeHTML(app.full_name)}</td>
      <td>${escapeHTML(app.credit_range || '—')}</td>
      <td><span class="status-badge status-badge--${app.status}">${escapeHTML(app.status)}</span></td>
      <td>${submitted}</td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-view="${app.id}">View</button>
      </td>
    </tr>
  `;
}

async function loadApps() {
  let query = supabase
    .from('financing_applications')
    .select('*, cars(year, make, model, trim_level)')
    .order('created_at', { ascending: false });

  if (statusFilter.value) query = query.eq('status', statusFilter.value);

  const { data, error } = await query;

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">Couldn't load applications.</td></tr>`;
    return;
  }
  appsCache = data || [];
  if (!appsCache.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No applications match this filter.</td></tr>`;
    return;
  }

  tableBody.innerHTML = appsCache.map(rowHTML).join('');
  tableBody.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => openDetail(appsCache.find((a) => a.id === btn.dataset.view)));
  });
}

function openDetail(app) {
  if (!app) return;
  currentApp = app;

  document.getElementById('detail-content').innerHTML = `
    <dl>
      <dt>Application Code</dt><dd class="mono">${escapeHTML(app.application_code)}</dd>
      <dt>Vehicle</dt><dd>${escapeHTML(carTitle(app))}</dd>
      <dt>Applicant</dt><dd>${escapeHTML(app.full_name)}</dd>
      <dt>Email</dt><dd>${escapeHTML(app.email)}</dd>
      <dt>Phone</dt><dd>${escapeHTML(app.phone)}</dd>
      <dt>Date of Birth</dt><dd>${escapeHTML(app.date_of_birth || '—')}</dd>
      <dt>Address</dt><dd>${escapeHTML([app.address_line, app.city, app.state, app.zip].filter(Boolean).join(', ') || '—')}</dd>
      <dt>Employment</dt><dd>${escapeHTML(app.employment_status || '—')}${app.employer_name ? ' · ' + escapeHTML(app.employer_name) : ''}</dd>
      <dt>Monthly Income</dt><dd>${app.monthly_income ? formatCurrency(app.monthly_income) : '—'}</dd>
      <dt>Credit Range</dt><dd>${escapeHTML(app.credit_range || '—')}</dd>
      <dt>Down Payment Offered</dt><dd>${app.down_payment_offered ? formatCurrency(app.down_payment_offered) : '—'}</dd>
      <dt>Submitted</dt><dd>${new Date(app.created_at).toLocaleString()}</dd>
    </dl>
  `;

  document.getElementById('detail-status').value = app.status;
  document.getElementById('detail-guide').value = app.assigned_guide || '';
  document.getElementById('detail-notes').value = app.admin_notes || '';
  detailPanel.hidden = false;
}

document.getElementById('detail-close').addEventListener('click', () => { detailPanel.hidden = true; });

document.getElementById('detail-save').addEventListener('click', async () => {
  if (!currentApp) return;

  const payload = {
    status: document.getElementById('detail-status').value,
    assigned_guide: document.getElementById('detail-guide').value.trim() || null,
    admin_notes: document.getElementById('detail-notes').value.trim() || null,
  };

  const { error } = await supabase.from('financing_applications').update(payload).eq('id', currentApp.id);
  if (error) {
    showToast("Couldn't update this application.", true);
    return;
  }
  showToast('Application updated.');
  detailPanel.hidden = true;
  loadApps();
});

statusFilter.addEventListener('change', loadApps);

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'financing.html');
  loadApps();
}

init();