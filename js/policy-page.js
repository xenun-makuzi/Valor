import { supabase } from './supabase-client.js';
import { escapeHTML } from './utils.js';

async function renderPolicy() {
  const field = document.body.dataset.policyField; // "shipping_policy" or "refund_policy"
  const root = document.getElementById('policy-root');
  if (!field || !root) return;

  const { data, error } = await supabase.from('site_settings').select(field).eq('id', 1).single();

  if (error || !data || !Array.isArray(data[field]) || !data[field].length) {
    root.innerHTML = `<div class="empty-state"><strong>This page hasn't been filled in yet</strong>Add sections to <code class="mono">site_settings.${field}</code> in Supabase — each one is a {heading, body} object.</div>`;
    return;
  }

  root.innerHTML = data[field].map((block) => `
    <div class="policy-block">
      <h2 class="policy-block__heading">${escapeHTML(block.heading || '')}</h2>
      <p class="policy-block__body">${escapeHTML(block.body || '')}</p>
    </div>
  `).join('');
}

renderPolicy();