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

    // Convert from our format to Gemini format
    // body.image = { data: base64, mimeType: 'image/jpeg' }
    // body.prompt = string

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
        maxOutputTokens: 1000,
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
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API Fehler' }), {
        status: resp.status, headers: ch,
      });
    }

    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ text }), { headers: ch });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: ch });
  }
}
