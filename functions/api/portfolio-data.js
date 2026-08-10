// Cloudflare Pages Function: GET/POST /api/portfolio-data backed by KV.
// SAVE_TOKEN = sha256('cf-save:' + admin password). Update it when the password changes.
const SAVE_TOKEN = '8166980106d659e0c26365e4fc6f2f81fce696030ee4a44ce00dfcf7eb2495c2';
const KEY = 'portfolio_state';
// The site is served from GitHub Pages; only that origin may read/write.
const ALLOWED_ORIGINS = ['https://thesarpandji.github.io', 'https://thesarpandji.pages.dev'];

function headersFor(request) {
  const origin = request.headers.get('Origin');
  const h = { 'Content-Type': 'application/json' };
  if (ALLOWED_ORIGINS.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
  }
  return h;
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    headers: {
      ...headersFor(request),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function onRequestGet({ request, env }) {
  const data = await env.PORTFOLIO_KV.get(KEY);
  return new Response(data || JSON.stringify({ notFound: true }), { headers: headersFor(request) });
}

export async function onRequestPost({ request, env }) {
  const h = headersFor(request);
  if (request.headers.get('x-admin-token') !== SAVE_TOKEN) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: h });
  }
  const body = await request.text();
  if (body.length > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ success: false, error: 'Payload too large' }), { status: 413, headers: h });
  }
  try { JSON.parse(body); } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: h });
  }
  await env.PORTFOLIO_KV.put(KEY, body);
  return new Response(JSON.stringify({ success: true }), { headers: h });
}
