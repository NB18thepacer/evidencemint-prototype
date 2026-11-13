const ALLOWED_ORIGINS = new Set([
  'https://evidencemint-prototype.vercel.app',
  'https://nb18thepacer.github.io'
]);

function reply(res, status, value) { return res.status(status).json(value); }
function getBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
function restHeaders(key, token) {
  return { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(res, 403, { error: 'Origin not allowed.' });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return reply(res, 405, { error: 'Use GET or POST.' });
  const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !anon || !service) return reply(res, 503, { error: 'Shared workspace is not configured. Add the Supabase URL, anon key, and service role key in Vercel.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(res, 401, { error: 'Sign in to access the shared workspace.' });

  try {
    const authResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!authResponse.ok) return reply(res, 401, { error: 'Your session expired. Sign in again.' });
    const user = await authResponse.json();
    const profileResponse = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,workspace_id,role,display_name`, { headers: restHeaders(service, service) });
    if (!profileResponse.ok) throw new Error(await profileResponse.text());
    let profile = (await profileResponse.json())[0];
    if (!profile) return reply(res, 403, { error: 'Your profile is not ready. Sign out and sign in again.' });
    const body = req.method === 'POST' ? getBody(req) : {};
    if (req.method === 'POST' && body.action === 'join') {
      const role = ['creator','reviewer','admin'].includes(body.role) ? body.role : 'creator';
      const expected = role === 'admin' ? process.env.ADMIN_JOIN_CODE : role === 'reviewer' ? process.env.REVIEWER_JOIN_CODE : process.env.TEAM_JOIN_CODE;
      if (!expected || typeof body.code !== 'string' || body.code !== expected) return reply(res, 403, { error: 'That team invite code is not valid for the selected role.' });
      const joined = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH', headers: { ...restHeaders(service, service), Prefer: 'return=representation' },
        body: JSON.stringify({ workspace_id: 'b8d6d70c-ff7d-41c1-bb59-4e0b30be8f41', role, display_name: String(body.name || '').trim().slice(0, 100) })
      });
      if (!joined.ok) throw new Error(await joined.text());
      profile = (await joined.json())[0];
      return reply(res, 200, { ok: true, profile });
    }
    if (!profile?.workspace_id) return reply(res, 403, { error: 'Join the Team NAS workspace with an invite code first.' });
    const headers = restHeaders(service, service);
    const workspace = encodeURIComponent(profile.workspace_id);

    if (req.method === 'GET') {
      const reviewQuery = profile.role === 'admin'
        ? null
        : `${base}/rest/v1/reviews?workspace_id=eq.${workspace}${profile.role === 'creator' ? `&creator_id=eq.${encodeURIComponent(user.id)}` : ''}&select=id,creator_id,payload,updated_at&order=updated_at.desc`;
      const [reviewsResponse, recordsResponse] = await Promise.all([
        reviewQuery ? fetch(reviewQuery, { headers }) : Promise.resolve({ ok: true, json: async () => [] }),
        fetch(`${base}/rest/v1/approved_records?workspace_id=eq.${workspace}&select=id,record_key,record_type,version,title,content,source_url,valid_until,created_at,active&order=created_at.desc`, { headers })
      ]);
      if (!reviewsResponse.ok) throw new Error(await reviewsResponse.text());
      if (!recordsResponse.ok) throw new Error(await recordsResponse.text());
      return reply(res, 200, { ok: true, profile, reviews: await reviewsResponse.json(), records: await recordsResponse.json() });
    }

    if (body.action === 'save-review') {
      if (profile.role === 'admin') return reply(res, 403, { error: 'Admins manage guidelines; only creators and reviewers can update reviews.' });
      const draft = body.draft;
      if (!draft || typeof draft.id !== 'string' || !draft.payload || typeof draft.payload !== 'object') return reply(res, 400, { error: 'Invalid review record.' });
      const existingResponse = await fetch(`${base}/rest/v1/reviews?workspace_id=eq.${workspace}&id=eq.${encodeURIComponent(draft.id)}&select=creator_id,payload&limit=1`, { headers });
      if (!existingResponse.ok) throw new Error(await existingResponse.text());
      const priorDraft = (await existingResponse.json())[0];
      if (profile.role === 'reviewer' && !priorDraft) return reply(res, 403, { error: 'Reviewers can only decide on a submitted creator review.' });
      if (profile.role === 'reviewer' && !['in_review','challenge','returned'].includes(priorDraft?.payload?.status)) return reply(res, 409, { error: 'This review is not awaiting a reviewer decision.' });
      if (profile.role === 'creator' && priorDraft && priorDraft.creator_id !== user.id) return reply(res, 403, { error: 'Creators can only edit their own reviews.' });
      if (profile.role === 'creator' && draft.payload.status === 'approved') return reply(res, 403, { error: 'Only a reviewer can approve a version.' });
      if (profile.role === 'creator' && draft.payload.status === 'in_review' && (!priorDraft || !['checked','returned'].includes(priorDraft.payload?.status))) return reply(res, 409, { error: 'Run the AI review before sending a version to a reviewer.' });
      if (profile.role === 'creator' && draft.payload.status === 'challenge' && (!priorDraft || priorDraft.payload?.status !== 'in_review' || !String(draft.payload.challenge?.note || '').trim())) return reply(res, 409, { error: 'A challenge can be raised only after submission and must include a reason.' });
      if (profile.role === 'reviewer' && draft.payload.status === 'approved' && (!priorDraft || !['in_review','challenge','returned'].includes(priorDraft.payload?.status) || Number(draft.payload.approvedVersion) !== Number(draft.payload.version))) return reply(res, 409, { error: 'Only the exact submitted version can be approved.' });
      if (profile.role === 'reviewer' && draft.payload.status === 'returned' && !String(draft.payload.reviewerNote || '').trim()) return reply(res, 400, { error: 'Add a reason before returning the draft.' });
      const saved = await fetch(`${base}/rest/v1/reviews?on_conflict=workspace_id,id`, {
        method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: draft.id, workspace_id: profile.workspace_id, creator_id: priorDraft?.creator_id || user.id, payload: draft.payload, updated_at: new Date().toISOString() })
      });
      if (!saved.ok) throw new Error(await saved.text());
      return reply(res, 200, { ok: true });
    }

    if (body.action === 'add-record') {
      if (profile.role !== 'admin') return reply(res, 403, { error: 'Only an admin can update approved facts and guidelines.' });
      const record = body.record || {};
      const type = ['fact', 'guideline'].includes(record.record_type) ? record.record_type : '';
      const key = String(record.record_key || '').trim().slice(0, 80);
      const title = String(record.title || '').trim().slice(0, 180);
      const content = String(record.content || '').trim().slice(0, 2000);
      const source = String(record.source_url || '').trim().slice(0, 1000);
      const validUntil = record.valid_until || null;
      if (!type || !key || !title || !content) return reply(res, 400, { error: 'Type, stable record key, title, and content are required.' });
      if (!/^[A-Za-z0-9._-]+$/.test(key)) return reply(res, 400, { error: 'Use only letters, numbers, dots, dashes, and underscores in the stable key.' });
      if (source && !/^https:\/\//i.test(source)) return reply(res, 400, { error: 'Source links must start with https://.' });
      const priorResponse = await fetch(`${base}/rest/v1/approved_records?workspace_id=eq.${workspace}&record_key=eq.${encodeURIComponent(key)}&select=version&order=version.desc&limit=1`, { headers });
      if (!priorResponse.ok) throw new Error(await priorResponse.text());
      const prior = (await priorResponse.json())[0];
      const nextVersion = Number(prior?.version || 0) + 1;
      const insert = await fetch(`${base}/rest/v1/approved_records`, {
        method: 'POST', headers,
        body: JSON.stringify({ workspace_id: profile.workspace_id, record_key: key, record_type: type, version: nextVersion, title, content, source_url: source || null, valid_until: validUntil || null, created_by: user.id, active: true })
      });
      if (!insert.ok) throw new Error(await insert.text());
      return reply(res, 201, { ok: true, version: nextVersion });
    }
    return reply(res, 400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('EvidenceMint cloud error:', String(error?.message || error).slice(0, 500));
    return reply(res, 502, { error: 'Could not reach the shared workspace. Check the Supabase schema and Vercel settings.' });
  }
};
