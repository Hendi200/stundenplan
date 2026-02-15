export async function onRequest(context) {
  const ch = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: ch });
  }
  if (context.request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), { headers: ch });
  }
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: ch });
  }
  const key = context.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' }), { status: 500, headers: ch });
  }
  try {
    const body = await context.request.json();
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: body.model || 'claude-sonnet-4-20250514', max_tokens: body.max_tokens || 1000, messages: body.messages }),
    });
    const data = await resp.text();
    return new Response(data, { status: resp.status, headers: ch });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: ch });
  }
}
