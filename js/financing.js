import { supabase } from './supabase-client.js';
import { escapeHTML, formatCurrency } from './utils.js';
import { initWizard, initModal } from './form-helper.js';

const params = new URLSearchParams(window.location.search);
const carId = params.get('car');

const form = document.getElementById('financing-form');
const modal = document.getElementById('confirmation-modal');
const modalController = initModal(modal);

/* ------------------------------------------------------------
   1. Payment Estimator Calculations
   ------------------------------------------------------------ */
function initEstimator() {
  const priceInput = document.getElementById('calc-price');
  const downInput = document.getElementById('calc-down');
  const termInput = document.getElementById('calc-term');
  const resultDisplay = document.getElementById('calc-monthly');

  if (!priceInput || !downInput || !termInput || !resultDisplay) return;

  function calculate() {
    const price = parseFloat(priceInput.value) || 0;
    const down = parseFloat(downInput.value) || 0;
    const termMonths = parseInt(termInput.value, 10) || 60;
    const estimatedAPR = 0.0499; // 4.99% benchmark

    const principal = Math.max(0, price - down);
    if (principal === 0) {
      resultDisplay.textContent = '$0 / mo';
      return;
    }

    const monthlyRate = estimatedAPR / 12;
    const monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    resultDisplay.textContent = `${formatCurrency(Math.round(monthlyPayment))} / mo`;
  }

  [priceInput, downInput, termInput].forEach((el) => {
    el.addEventListener('input', calculate);
    el.addEventListener('change', calculate);
  });

  calculate();
}

/* ------------------------------------------------------------
   2. Context & Pre-filling
   ------------------------------------------------------------ */
async function loadCarContext() {
  if (!carId) return;

  const { data: car, error } = await supabase
    .from('cars')
    .select('id, year, make, model, trim_level, full_price, down_payment')
    .eq('id', carId)
    .single();

  if (error || !car) {
    console.error('Error loading car context:', error);
    return;
  }

  const banner = document.getElementById('context-banner');
  const carLabel = document.getElementById('context-car-title');
  const title = `${car.year} ${car.make} ${car.model}${car.trim_level ? ' ' + car.trim_level : ''}`;
  if (carLabel) carLabel.textContent = title;
  if (banner) banner.hidden = false;

  const downInput = document.getElementById('down_payment_offered');
  if (downInput && car.down_payment && !downInput.value) {
    downInput.value = car.down_payment;
  }

  // Pre-fill estimator values if vehicle is selected
  const calcPrice = document.getElementById('calc-price');
  const calcDown = document.getElementById('calc-down');
  if (calcPrice && car.full_price) calcPrice.value = car.full_price;
  if (calcDown && car.down_payment) calcDown.value = car.down_payment;

  // Re-run calculation with new vehicle specs
  const priceInput = document.getElementById('calc-price');
  if (priceInput) priceInput.dispatchEvent(new Event('input'));
}

/* ------------------------------------------------------------
   3. Wizard & Form Review Synchronizer
   ------------------------------------------------------------ */
function populateReview() {
  const reviewEl = document.getElementById('review-summary');
  if (!reviewEl) return;

  const data = new FormData(form);
  const rows = [
    ['Name', data.get('full_name')],
    ['Email', data.get('email')],
    ['Phone', data.get('phone')],
    [
      'Address',
      [data.get('address_line'), data.get('city'), data.get('state'), data.get('zip')]
        .filter(Boolean)
        .join(', '),
    ],
    ['Employment', data.get('employment_status')],
    ['Monthly Income', data.get('monthly_income') ? formatCurrency(data.get('monthly_income')) : ''],
    ['Estimated Credit', data.get('credit_range')],
    ['Down Payment', data.get('down_payment_offered') ? formatCurrency(data.get('down_payment_offered')) : ''],
  ].filter(([, value]) => value);

  reviewEl.innerHTML = rows
    .map(
      ([label, value]) =>
        `<div class="review-row"><span>${escapeHTML(label)}</span><span>${escapeHTML(value)}</span></div>`
    )
    .join('');
}

const wizard = initWizard(form, {
  onBeforeStep: (nextIndex) => {
    if (nextIndex === 2) populateReview();
  },
});

function showError(message) {
  const errorEl = document.getElementById('form-error');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

/* ------------------------------------------------------------
   4. Form Submission Handler
   ------------------------------------------------------------ */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!wizard.validateCurrentStep()) return;

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Application…';

  const data = new FormData(form);

  // Generate reference application code client-side
  const applicationCode = 'APP-' + Math.floor(100000 + Math.random() * 900000);

  const payload = {
    application_code: applicationCode,
    car_id: carId || null,
    full_name: data.get('full_name'),
    email: data.get('email'),
    phone: data.get('phone'),
    date_of_birth: data.get('date_of_birth') || null,
    address_line: data.get('address_line') || null,
    city: data.get('city') || null,
    state: data.get('state') || null,
    zip: data.get('zip') || null,
    employment_status: data.get('employment_status') || null,
    employer_name: data.get('employer_name') || null,
    monthly_income: data.get('monthly_income') ? Number(data.get('monthly_income')) : null,
    credit_range: data.get('credit_range'),
    down_payment_offered: data.get('down_payment_offered') ? Number(data.get('down_payment_offered')) : null,
  };

  // Perform insert WITHOUT .select() to prevent unauthorized read checks
  const { error } = await supabase
    .from('financing_applications')
    .insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Pre-Qualification';

  if (error) {
    console.error('Financing submission error:', error);
    showError('Something went wrong submitting your application. Please try again or call our support.');
    return;
  }

  const codeEl = document.getElementById('modal-app-code');
  if (codeEl) codeEl.textContent = applicationCode;

  form.hidden = true;
  document.getElementById('context-banner')?.setAttribute('hidden', '');
  document.getElementById('form-success-note')?.removeAttribute('hidden');
  modalController.open();
});

// Initialize UI behaviors
initEstimator();
loadCarContext();