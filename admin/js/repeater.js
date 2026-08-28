import { escapeHTML, escapeAttr } from '../../js/utils.js';

// Generic repeater for arrays of simple objects.
// fields: [{ key, label, type: 'text' | 'textarea' }]
// Returns { addEmptyRow(), getValues() } — getValues() drops fully-empty rows.
export function createRepeater(container, fields, initialItems = []) {
  function fieldHTML(f, item) {
    if (f.type === 'select') {
      const optsHTML = f.options
        .map((opt) => `<option value="${escapeAttr(opt.value)}" ${item[f.key] === opt.value ? 'selected' : ''}>${escapeHTML(opt.label)}</option>`)
        .join('');
      return `<select class="repeater-field" data-key="${f.key}">${optsHTML}</select>`;
    }
    if (f.type === 'textarea') {
      return `<textarea class="repeater-field" data-key="${f.key}" rows="2">${escapeHTML(item[f.key] || '')}</textarea>`;
    }
    return `<input type="text" class="repeater-field" data-key="${f.key}" value="${escapeAttr(item[f.key] || '')}">`;
  }

  function addRow(item = {}) {
    const row = document.createElement('div');
    row.className = 'repeater-row';
    row.innerHTML =
      fields.map((f) => `<div class="form-field"><label>${escapeHTML(f.label)}</label>${fieldHTML(f, item)}</div>`).join('') +
      `<button type="button" class="btn btn--outline btn--sm repeater-row__remove">Remove</button>`;

    row.querySelector('.repeater-row__remove').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  container.innerHTML = '';
  (initialItems || []).forEach(addRow);

  return {
    addEmptyRow: () => addRow({}),
    getValues: () =>
      Array.from(container.querySelectorAll('.repeater-row'))
        .map((row) => {
          const obj = {};
          row.querySelectorAll('.repeater-field').forEach((el) => { obj[el.dataset.key] = el.value.trim(); });
          return obj;
        })
        .filter((obj) => Object.values(obj).some(Boolean)),
  };
}