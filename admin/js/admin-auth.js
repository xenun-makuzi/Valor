import { supabase } from '../../js/supabase-client.js';

// Call this at the top of every admin page except login.html.
// Returns { user, admin } if the visitor is signed in AND present
// in the admins table, or null (after redirecting to login) otherwise.
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: adminRow, error } = await supabase
    .from('admins')
    .select('id, name')
    .eq('id', session.user.id)
    .single();

  if (error || !adminRow) {
    // Signed in, but not an admin — don't leave them half-authenticated.
    await supabase.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  return { user: session.user, admin: adminRow };
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}