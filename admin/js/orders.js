import { supabase } from '../../js/supabase-client.js';
import { escapeHTML } from '../../js/utils.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';

const tableBody = document.getElementById('table-body');
const detailPanel = document.getElementById('detail-panel');
const statusFilter = document.getElementById('status-filter');

const STATUSES = ['pending', 'contacted', 'paid', 'shipped', 'completed', 'cancelled'];

let ordersCache = [];
let currentOrder = null;

function statusOptionsHTML(current) {
  return STATUSES.map((s) => `<option value="${s}" ${s === current ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('');
}

function carTitle(order) {
  const car = order.cars;
  return car ? `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}` : '—';
}

function rowHTML(order) {
  const placed = new Date(order.created_at).toLocaleDateString();
  return `
    <tr>
      <td class="mono">${escapeHTML(order.order_code)}</td>
      <td>${escapeHTML(carTitle(order))}</td>
      <td>${escapeHTML(order.customer_name)}</td>
      <td><span class="status-badge status-badge--${order.status}">${escapeHTML(order.status)}</span></td>
      <td>${placed}</td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--outline btn--sm" data-view="${order.id}">View</button>
      </td>
    </tr>
  `;
}

async function loadOrders() {
  let query = supabase
    .from('orders')
    .select('*, cars(year, make, model, trim_level), payment_methods(name)')
    .order('created_at', { ascending: false });

  if (statusFilter.value) query = query.eq('status', statusFilter.value);

  const { data, error } = await query;

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="admin-table-empty">Couldn't load orders.</td></tr>`;
    return;
  }
  ordersCache = data || [];
  if (!ordersCache.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="admin-table-empty">No orders match this filter.</td></tr>`;
    return;
  }

  tableBody.innerHTML = ordersCache.map(rowHTML).join('');
  tableBody.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => openDetail(ordersCache.find((o) => o.id === btn.dataset.view)));
  });
}

function openDetail(order) {
  if (!order) return;
  currentOrder = order;

  document.getElementById('detail-content').innerHTML = `
    <dl>
      <dt>Order Code</dt><dd class="mono">${escapeHTML(order.order_code)}</dd>
      <dt>Vehicle</dt><dd>${escapeHTML(carTitle(order))}</dd>
      <dt>Customer</dt><dd>${escapeHTML(order.customer_name)}</dd>
      <dt>Email</dt><dd>${escapeHTML(order.customer_email)}</dd>
      <dt>Phone</dt><dd>${escapeHTML(order.customer_phone)}${order.is_whatsapp ? ' (WhatsApp)' : ''}</dd>
      <dt>Address</dt><dd>${escapeHTML([order.address_line, order.city, order.state, order.zip].filter(Boolean).join(', ') || '—')}</dd>
      <dt>Shipping</dt><dd>${order.needs_shipping ? 'Yes' : 'No, local pickup'}</dd>
      <dt>Payment Method</dt><dd>${escapeHTML(order.payment_methods?.name || '—')}</dd>
      <dt>Placed</dt><dd>${new Date(order.created_at).toLocaleString()}</dd>
    </dl>
  `;

  document.getElementById('detail-status').innerHTML = statusOptionsHTML(order.status);
  document.getElementById('detail-notes').value = order.notes || '';
  detailPanel.hidden = false;
}

document.getElementById('detail-close').addEventListener('click', () => { detailPanel.hidden = true; });

document.getElementById('detail-save').addEventListener('click', async () => {
  if (!currentOrder) return;
  const status = document.getElementById('detail-status').value;
  const notes = document.getElementById('detail-notes').value.trim() || null;

  const { error } = await supabase.from('orders').update({ status, notes }).eq('id', currentOrder.id);
  if (error) {
    showToast("Couldn't update this order.", true);
    return;
  }
  showToast('Order updated.');
  detailPanel.hidden = true;
  loadOrders();
});

statusFilter.addEventListener('change', loadOrders);

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'orders.html');
  loadOrders();
}

init();