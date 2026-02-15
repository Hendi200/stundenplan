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

  const key = context.env.GEMINI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY nicht konfiguriert' }), {
      status: 500, headers: ch,
    });
  }

  try {
    const body = await context.request.json();

    const geminiBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: body.image.mimeType,
              data: body.image.data,
            }
          },
          {
            text: body.prompt
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API Fehler ' + resp.status }), {
        status: resp.status, headers: ch,
      });
    }

    // Extract ALL text parts from Gemini response
    let text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      text = data.candidates[0].content.parts
        .filter(p => p.text)
        .map(p => p.text)
        .join('');
    }

    return new Response(JSON.stringify({ text }), { headers: ch });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: ch });
  }
}
