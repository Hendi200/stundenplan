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

  try {
    const body = await context.request.json();

    if (body.devCode !== '9873') {
      return new Response(JSON.stringify({ error: 'Ungültiger Entwicklercode' }), {
        status: 403, headers: ch,
      });
    }

    const keys = [];
    if (context.env.GEMINI_API_KEY) keys.push(context.env.GEMINI_API_KEY);
    if (context.env.GEMINI_API_KEY2) keys.push(context.env.GEMINI_API_KEY2);

    if (!keys.length) {
      return new Response(JSON.stringify({ error: 'Keine API Keys konfiguriert' }), {
        status: 500, headers: ch,
      });
    }

    const geminiBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: body.image.mimeType,
              data: body.image.data,
            }
          },
          { text: body.prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    };

    const startIdx = Math.floor(Math.random() * keys.length);
    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[(startIdx + i) % keys.length];

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      );

      const data = await resp.json();

      if (resp.ok) {
        let text = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          text = data.candidates[0].content.parts
            .filter(p => p.text)
            .map(p => p.text)
            .join('');
        }
        return new Response(JSON.stringify({ text }), { headers: ch });
      }

      if (resp.status === 429 || resp.status === 403) {
        lastError = data.error?.message || 'Limit erreicht';
        continue;
      }

      return new Response(JSON.stringify({ error: data.error?.message || 'API Fehler ' + resp.status }), {
        status: resp.status, headers: ch,
      });
    }

    return new Response(JSON.stringify({ error: lastError || 'Alle API Keys ausgelastet' }), {
      status: 429, headers: ch,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: ch });
  }
}
