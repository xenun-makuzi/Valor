import { supabase } from '../../js/supabase-client.js';
import { requireAdmin } from './admin-auth.js';
import { renderAdminShell, showToast } from './admin-layout.js';
import { createRepeater } from './repeater.js';

const form = document.getElementById('settings-form');
let shippingRepeater = null;
let refundRepeater = null;

const POLICY_FIELDS = [
  { key: 'heading', label: 'Heading', type: 'text' },
  { key: 'body', label: 'Body', type: 'textarea' },
];

async function loadSettings() {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  if (error || !data) {
    showToast("Couldn't load site settings.", true);
    return;
  }

  document.getElementById('site_name').value = data.site_name || '';
  document.getElementById('logo_url').value = data.logo_url || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('whatsapp_number').value = data.whatsapp_number || '';
  document.getElementById('facebook_url').value = data.facebook_url || '';
  document.getElementById('dealer_license').value = data.dealer_license || '';
  document.getElementById('address').value = data.address || '';

  shippingRepeater = createRepeater(document.getElementById('shipping-repeater'), POLICY_FIELDS, data.shipping_policy || []);
  refundRepeater = createRepeater(document.getElementById('refund-repeater'), POLICY_FIELDS, data.refund_policy || []);
}

document.getElementById('add-shipping-block').addEventListener('click', () => shippingRepeater.addEmptyRow());
document.getElementById('add-refund-block').addEventListener('click', () => refundRepeater.addEmptyRow());

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    site_name: document.getElementById('site_name').value.trim() || null,
    logo_url: document.getElementById('logo_url').value.trim() || null,
    phone: document.getElementById('phone').value.trim() || null,
    whatsapp_number: document.getElementById('whatsapp_number').value.trim() || null,
    facebook_url: document.getElementById('facebook_url').value.trim() || null,
    dealer_license: document.getElementById('dealer_license').value.trim() || null,
    address: document.getElementById('address').value.trim() || null,
    shipping_policy: shippingRepeater.getValues(),
    refund_policy: refundRepeater.getValues(),
  };

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  const { error } = await supabase.from('site_settings').update(payload).eq('id', 1);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Settings';

  if (error) {
    showToast("Couldn't save settings.", true);
    return;
  }
  showToast('Settings saved.');
});

async function init() {
  const session = await requireAdmin();
  if (!session) return;
  renderAdminShell(session, 'settings.html');
  loadSettings();
}

init();