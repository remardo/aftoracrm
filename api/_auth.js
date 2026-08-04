// Shared auth + helper utilities for API routes.
// Files prefixed with "_" are excluded from Vercel serverless function generation,
// but can still be imported by route handlers.

export async function getProfile(req, supabase) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { user: null, profile: null, error: 'Не авторизован' };
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null, profile: null, error: 'Недействительный токен' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single();
  // backfill user_id link if missing
  if (profile && !profile.user_id) {
    await supabase.from('profiles').update({ user_id: user.id }).eq('id', profile.id);
  }
  return { user, profile: profile || null, error: null };
}

export function isFactory(p) {
  return p && (p.role === 'factory_admin' || p.role === 'factory_manager');
}

export function isAdmin(p) {
  return p && p.role === 'factory_admin';
}

export function requireProfile(profile, res) {
  if (!profile) { res.status(403).json({ error: 'Профиль не активирован' }); return false; }
  if (profile.status === 'blocked') { res.status(403).json({ error: 'Профиль заблокирован' }); return false; }
  return true;
}

export function requireFactory(profile, res) {
  if (!isFactory(profile)) { res.status(403).json({ error: 'Доступ только для сотрудников фабрики' }); return false; }
  return true;
}

export function requireAdmin(profile, res) {
  if (!isAdmin(profile)) { res.status(403).json({ error: 'Доступ только для руководства фабрики' }); return false; }
  return true;
}

export async function logActivity(supabase, entry) {
  try {
    await supabase.from('activity_log').insert({
      user_email: entry.user_email || null,
      user_name: entry.user_name || null,
      action: entry.action || '',
      entity_type: entry.entity_type || null,
      entity_id: entry.entity_id || null,
      details: entry.details || null,
    });
  } catch (e) { console.error('activity log failed:', e.message); }
}

export async function notify(supabase, n) {
  try {
    await supabase.from('notifications').insert({
      user_email: n.user_email || null,
      target_role: n.target_role || null,
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'info',
      related_id: n.related_id || null,
      read: false,
    });
  } catch (e) { console.error('notify failed:', e.message); }
}

export async function notifyDealerUsers(supabase, dealerId, n) {
  try {
    const { data: users } = await supabase.from('profiles').select('email').eq('dealer_id', dealerId);
    if (users && users.length) {
      await supabase.from('notifications').insert(
        users.map(u => ({ user_email: u.email, target_role: null, title: n.title, message: n.message, type: n.type || 'info', related_id: n.related_id || null, read: false }))
      );
    }
  } catch (e) { console.error('notifyDealerUsers failed:', e.message); }
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
