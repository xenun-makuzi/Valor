import { supabase } from '../../js/supabase-client.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell } from './admin-layout.js';

async function loadStats() {
  const [pendingOrders, pendingFinancing, totalCars, availableCars] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('financing_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('cars').select('id', { count: 'exact', head: true }),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('status', 'available'),
  ]);

  document.getElementById('stat-pending-orders').textContent = pendingOrders.count ?? '0';
  document.getElementById('stat-pending-financing').textContent = pendingFinancing.count ?? '0';
  document.getElementById('stat-total-cars').textContent = totalCars.count ?? '0';
  document.getElementById('stat-available-cars').textContent = availableCars.count ?? '0';
}

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'admin.html');
  loadStats();
}

init();