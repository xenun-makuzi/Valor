import { supabase } from './supabase-client.js';
import { escapeHTML, escapeAttr, carCardHTML } from './utils.js';

const PAGE_SIZE = 12;

const grid = document.getElementById('inventory-grid');
const resultsCountEl = document.getElementById('results-count');
const loadMoreBtn = document.getElementById('load-more-btn');
const categorySelect = document.getElementById('filter-category');
const downSelect = document.getElementById('filter-down');
const sortSelect = document.getElementById('filter-sort');
const searchInput = document.getElementById('filter-search');
const filterForm = document.getElementById('filter-form');
const clearBtn = document.getElementById('clear-filters');

let categories = [];
let offset = 0;

function getStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get('category') || '',
    maxDown: params.get('maxDown') || '',
    q: params.get('q') || '',
    sort: params.get('sort') || 'featured',
  };
}

function syncUrl(state) {
  const params = new URLSearchParams();
  if (state.category) params.set('category', state.category);
  if (state.maxDown) params.set('maxDown', state.maxDown);
  if (state.q) params.set('q', state.q);
  if (state.sort && state.sort !== 'featured') params.set('sort', state.sort);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function applyStateToControls(state) {
  if (categorySelect) categorySelect.value = state.category;
  if (downSelect) downSelect.value = state.maxDown;
  if (sortSelect) sortSelect.value = state.sort;
  if (searchInput) searchInput.value = state.q;
}

async function loadCategories() {
  const { data } = await supabase.from('categories').select('id, name, slug').eq('active', true).order('sort_order', { ascending: true });
  categories = data || [];
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">All Categories</option>' +
      categories.map((c) => `<option value="${escapeAttr(c.slug)}">${escapeHTML(c.name)}</option>`).join('');
  }
}

async function loadDownTiers() {
  const { data } = await supabase.from('down_payment_tiers').select('*').eq('active', true).order('sort_order', { ascending: true });
  if (downSelect) {
    downSelect.innerHTML = '<option value="">Any Down Payment</option>' +
      (data || []).map((t) => `<option value="${t.max_amount}">${escapeHTML(t.label)}</option>`).join('');
  }
}

function buildQuery(state, currentOffset) {
  let query = supabase
    .from('cars')
    .select(
      'id, year, make, model, trim_level, full_price, down_payment, monthly_payment, mileage, transmission, status, featured, sort_order, category_id, car_images(storage_path, sort_order)',
      { count: 'exact' }
    )
    .eq('status', 'available');

  if (state.category) {
    const cat = categories.find((c) => c.slug === state.category);
    if (cat) query = query.eq('category_id', cat.id);
  }
  if (state.maxDown) {
    query = query.lte('down_payment', Number(state.maxDown));
  }
  if (state.q) {
    const term = state.q.replace(/[%_]/g, '').trim();
    if (term) {
      query = query.or(`make.ilike.%${term}%,model.ilike.%${term}%,trim_level.ilike.%${term}%`);
    }
  }

  if (state.sort === 'price_low') query = query.order('down_payment', { ascending: true });
  else if (state.sort === 'price_high') query = query.order('down_payment', { ascending: false });
  else if (state.sort === 'newest') query = query.order('created_at', { ascending: false });
  else query = query.order('featured', { ascending: false }).order('sort_order', { ascending: true });

  return query.range(currentOffset, currentOffset + PAGE_SIZE - 1);
}

async function runSearch(state, resetOffset) {
  if (resetOffset) offset = 0;

  const { data: cars, count, error } = await buildQuery(state, offset);

  if (error) {
    grid.innerHTML = `<div class="empty-state"><strong>Something went wrong</strong>Check your Supabase URL/key in js/supabase-client.js, then refresh.</div>`;
    loadMoreBtn.hidden = true;
    return;
  }

  const totalCount = count || 0;

  if (resetOffset) {
    grid.innerHTML = cars && cars.length
      ? cars.map(carCardHTML).join('')
      : `<div class="empty-state"><strong>No vehicles match those filters</strong>Try widening your search, or check back soon as new inventory arrives.</div>`;
  } else {
    grid.insertAdjacentHTML('beforeend', (cars || []).map(carCardHTML).join(''));
  }

  offset += (cars || []).length;

  if (resultsCountEl) {
    resultsCountEl.textContent = totalCount === 1 ? '1 vehicle found' : `${totalCount} vehicles found`;
  }

  loadMoreBtn.hidden = offset >= totalCount;
}

function currentControlState() {
  return {
    category: categorySelect?.value || '',
    maxDown: downSelect?.value || '',
    q: searchInput?.value.trim() || '',
    sort: sortSelect?.value || 'featured',
  };
}

function onFilterChange() {
  const state = currentControlState();
  syncUrl(state);
  runSearch(state, true);
}

categorySelect?.addEventListener('change', onFilterChange);
downSelect?.addEventListener('change', onFilterChange);
sortSelect?.addEventListener('change', onFilterChange);

filterForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  onFilterChange();
});

clearBtn?.addEventListener('click', () => {
  if (categorySelect) categorySelect.value = '';
  if (downSelect) downSelect.value = '';
  if (searchInput) searchInput.value = '';
  if (sortSelect) sortSelect.value = 'featured';
  onFilterChange();
});

loadMoreBtn?.addEventListener('click', () => {
  runSearch(currentControlState(), false);
});

async function init() {
  await Promise.all([loadCategories(), loadDownTiers()]);
  const state = getStateFromUrl();
  applyStateToControls(state);
  await runSearch(state, true);
}

init();