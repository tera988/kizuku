// Uses only a temporary account and synthetic data; always deletes the account.
const base = process.env.TEST_URL || 'http://localhost:8791';
let cookie = '';
async function api(path, method = 'GET', data) {
  const r = await fetch(base + '/api/' + path, {
    method, headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
  const value = await r.json();
  if (!r.ok) throw Error(r.status + ': ' + JSON.stringify(value));
  return value;
}
try {
  await api('register', 'POST', { username: 'ai_check_' + Date.now(), password: crypto.randomUUID() });
  await api('records', 'POST', { date: new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Tokyo'}).format(new Date()), time: '07:00', source: 'manual', title: '検証用の架空記録', values: {sleep:7.5, steps:6000, mood:4, stress:2, conversation:45}, note: '', estimated: false });
  const s = await api('state'); s.settings.aiConsent = true;
  await api('settings', 'PUT', s.settings);
  const ai = await api('insights', 'POST', {});
  if (!ai.response || ai.source !== 'Workers AI') throw Error('Missing AI response');
  console.log(JSON.stringify({source: ai.source, response: ai.response}));
} finally {
  if (cookie) console.log('Cleanup:', await api('account', 'DELETE'));
}
