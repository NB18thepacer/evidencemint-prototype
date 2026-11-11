const ALLOWED_ORIGINS = new Set([
  'https://evidencemint-prototype.vercel.app',
  'https://nb18thepacer.github.io'
]);

module.exports = function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed.' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Use GET.' });
  }
  return res.status(200).json({
    ok: true,
    service: 'EvidenceMint review API',
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    guidelineCount: require('../guidelines.js').length,
    reviewMode: 'guideline-only; selectable PDF text is extracted in the browser; no web research'
  });
};
