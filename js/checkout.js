import { supabase, resolveImageUrl } from './supabase-client.js';
import { escapeHTML, escapeAttr, formatCurrency } from './utils.js';
import { initWizard, initModal } from './form-helper.js';

const params = new URLSearchParams(window.location.search);
const carId = params.get('car');

const checkoutBody = document.getElementById('checkout-body');
const form = document.getElementById('checkout-form');
const modal = document.getElementById('confirmation-modal');
const modalController = initModal(modal);

let currentCar = null;
let wizard = null;

function showNoCarState() {
  checkoutBody.innerHTML = `
    <div class="empty-state">
      <strong>No vehicle selected</strong>
      Choose a vehicle from our <a href="inventory.html">inventory</a> to continue with direct purchase.
    </div>
  `;
}

function renderOrderSummary(car) {
  const summaryEl = document.getElementById('order-summary');
  if (!summaryEl) return;

  const images = (car.car_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const imgUrl = images.length ? resolveImageUrl(images[0].storage_path) : null;
  const title = `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}`;

  summaryEl.innerHTML = `
    <div class="order-summary__media">
      ${imgUrl ? `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(title)}">` : ''}
    </div>
    <div class="order-summary__info">
      <div class="order-summary__title">${escapeHTML(title)}</div>
      <div class="order-summary__due">
        <span class="order-summary__due-label">Due to Secure This Vehicle</span>
        <span class="order-summary__due-amount">${formatCurrency(car.down_payment)}</span>
      </div>
    </div>
  `;
  summaryEl.hidden = false;
}

async function loadCar() {
  if (!carId) {
    showNoCarState();
    return;
  }

  const { data: car, error } = await supabase
    .from('cars')
    .select('id, year, make, model, trim_level, down_payment, car_images(storage_path, sort_order)')
    .eq('id', carId)
    .single();

  if (error || !car) {
    showNoCarState();
    return;
  }

  currentCar = car;
  renderOrderSummary(car);
}

async function loadPaymentMethods() {
  const list = document.getElementById('payment-method-list');
  if (!list) return;

  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !data || !data.length) {
    list.innerHTML = `<p class="form-note">No payment methods are available right now — contact us directly to complete your order.</p>`;
    return;
  }

  list.innerHTML = data
    .map((pm, i) => `
      <label class="payment-option">
        <input type="radio" name="payment_method_id" value="${escapeAttr(pm.id)}" required ${i === 0 ? 'checked' : ''}>
        <span>${escapeHTML(pm.name)}</span>
      </label>
    `)
    .join('');
}

function populateReview() {
  const reviewEl = document.getElementById('review-summary');
  if (!reviewEl) return;

  const data = new FormData(form);
  const rows = [
    ['Name', data.get('customer_name')],
    ['Email', data.get('customer_email')],
    ['Phone', data.get('customer_phone') + (data.get('is_whatsapp') ? ' (WhatsApp)' : '')],
    ['Address', [data.get('address_line'), data.get('city'), data.get('state'), data.get('zip')].filter(Boolean).join(', ')],
    ['Shipping', data.get('needs_shipping') === 'yes' ? 'Yes, please ship' : 'No, local pickup'],
  ].filter(([, value]) => value);

  reviewEl.innerHTML = rows
    .map(([label, value]) => `<div class="review-row"><span>${escapeHTML(label)}</span><span>${escapeHTML(value)}</span></div>`)
    .join('');
}

function showError(message) {
  const errorEl = document.getElementById('form-error');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

async function showConfirmation(orderCode) {
  const codeEl = document.getElementById('modal-order-code');
  if (codeEl) codeEl.textContent = orderCode;

  const { data: settings } = await supabase
    .from('site_settings')
    .select('whatsapp_number, facebook_url')
    .eq('id', 1)
    .single();

  const waLink = document.getElementById('modal-whatsapp-link');
  if (waLink && settings?.whatsapp_number) {
    const digits = settings.whatsapp_number.replace(/[^\d]/g, '');
    const msg = encodeURIComponent(`Hi, I have a question about my order ${orderCode}`);
    waLink.href = `https://wa.me/${digits}?text=${msg}`;
    waLink.hidden = false;
  }

  const fbLink = document.getElementById('modal-facebook-link');
  if (fbLink && settings?.facebook_url) {
    fbLink.href = settings.facebook_url;
    fbLink.hidden = false;
  }

  form.hidden = true;
  document.getElementById('order-summary')?.setAttribute('hidden', '');
  document.getElementById('form-success-note')?.removeAttribute('hidden');
  modalController.open();
}

async function init() {
  await loadCar();
  if (!currentCar) return;

  wizard = initWizard(form, {
    onBeforeStep: async (nextIndex) => {
      if (nextIndex === 2) {
        populateReview();
        await loadPaymentMethods();
      }
    },
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!wizard.validateCurrentStep()) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    const data = new FormData(form);

    // Generate reference order code client-side
    const orderCode = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const payload = {
      order_code: orderCode,
      car_id: currentCar.id,
      customer_name: data.get('customer_name'),
      customer_email: data.get('customer_email'),
      customer_phone: data.get('customer_phone'),
      is_whatsapp: data.get('is_whatsapp') === 'on',
      address_line: data.get('address_line') || null,
      city: data.get('city') || null,
      state: data.get('state') || null,
      zip: data.get('zip') || null,
      needs_shipping: data.get('needs_shipping') === 'yes',
      payment_method_id: data.get('payment_method_id') || null,
    };

    // Perform insert WITHOUT .select() to avoid 401 RLS read restrictions
    const { error } = await supabase
      .from('orders')
      .insert(payload);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Order';

    if (error) {
      console.error('Order submission error:', error);
      showError('Something went wrong submitting your order. Please try again, or contact us directly.');
      return;
    }

    showConfirmation(orderCode);
  });
}

init();