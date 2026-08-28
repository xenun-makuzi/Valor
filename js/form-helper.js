// Generic multi-step form controller. Shows one .form-step at a time,
// validates only the fields in the current step before advancing (so
// required fields in later, hidden steps don't block earlier ones),
// and updates .form-progress__step indicators to match.
export function initWizard(formEl, { onBeforeStep } = {}) {
  const steps = Array.from(formEl.querySelectorAll('.form-step'));
  const progressSteps = Array.from(formEl.querySelectorAll('.form-progress__step'));
  let current = 0;

  function showStep(index) {
    current = index;
    steps.forEach((step, i) => { step.hidden = i !== index; });
    progressSteps.forEach((el, i) => {
      el.classList.toggle('is-active', i === index);
      el.classList.toggle('is-complete', i < index);
    });
  }

  function validateCurrentStep() {
    const fields = steps[current].querySelectorAll('input, select, textarea');
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  steps.forEach((step) => {
    step.querySelectorAll('[data-step-next]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!validateCurrentStep()) return;
        const next = current + 1;
        if (next >= steps.length) return;
        if (onBeforeStep) await onBeforeStep(next);
        showStep(next);
      });
    });
    step.querySelectorAll('[data-step-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (current > 0) showStep(current - 1);
      });
    });
  });

  showStep(0);

  return { validateCurrentStep, showStep, getCurrentStep: () => current };
}

// Generic modal open/close: overlay click, close button, and Escape all close it.
export function initModal(modalEl) {
  function open() {
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }
  modalEl.querySelectorAll('[data-modal-close]').forEach((btn) => btn.addEventListener('click', close));
  modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
  document.addEventListener('keydown', (e) => {
    if (!modalEl.hidden && e.key === 'Escape') close();
  });
  return { open, close };
}