import { supabase } from '../../js/supabase-client.js';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('login-error');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    showError('Incorrect email or password.');
    return;
  }

  const { data: adminRow } = await supabase.from('admins').select('id').eq('id', data.user.id).single();

  if (!adminRow) {
    await supabase.auth.signOut();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    showError("This account doesn't have admin access.");
    return;
  }

  window.location.href = 'index.html';
});

// Already signed in as an admin? Skip straight to the dashboard.
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { data: adminRow } = await supabase.from('admins').select('id').eq('id', session.user.id).single();
  if (adminRow) window.location.href = 'index.html';
})();