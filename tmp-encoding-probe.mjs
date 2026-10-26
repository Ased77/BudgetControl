// Boot-path verification: repair ran at boot, API now serves the fixed name,
// and the creation guard rejects "?"-only names.
const base = 'http://localhost:3000';

// wait for the API
for (let i = 0; i < 30; i++) {
  try {
    const h = await fetch(base + '/api/health', { signal: AbortSignal.timeout(3000) });
    if (h.ok) break;
  } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 1000));
}

const login = await fetch(base + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: '09991000001', password: 'DevSysAdmin1405!' }),
});
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
console.log('login:', login.status);

const users = await (await fetch(base + '/api/users', { headers: { cookie } })).json();
const fixed = users.find((u) => u.id === '00000000-0000-4000-8000-00000000aaaa');
console.log('roster row after boot repair:', JSON.stringify({ id: fixed?.id, name: fixed?.name, role: fixed?.role }));

const q = users.filter((u) => /[?؟]/.test(String(u.name ?? '')));
console.log('remaining "?"-containing names in roster:', q.length);

// guard: creating an account with a "?"-only name must be rejected
const guard = await fetch(base + '/api/auth/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ mobile: '09991000099', password: 'ValidPass1405!', displayName: '???? ????? ????????', role: 'SYSTEM_ADMIN' }),
});
console.log('guard status:', guard.status, 'body:', await guard.text());

// sanity: a valid name must still be accepted
const okCreate = await fetch(base + '/api/auth/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ mobile: '09991000099', password: 'ValidPass1405!', displayName: 'دکتر مسعود عبداللهی', role: 'SYSTEM_ADMIN' }),
});
const okBody = await okCreate.json();
console.log('valid create status:', okCreate.status, 'name:', okBody.user?.name);
if (okBody.user?.id) {
  const del1 = await fetch(base + '/api/health', { headers: { cookie } }); // keep-alive noop
  console.log('created id:', okBody.user.id, '(will be removed from db directly)');
}
