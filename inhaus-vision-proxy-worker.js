/**
 * InHaus Vision Proxy — Cloudflare Worker
 * Proxies image analysis requests to Claude (Anthropic API)
 * Accepts: { imageBase64, mimeType, prompt } OR { imageUrl, prompt }
 * When imageUrl is provided, the Worker fetches the image server-side
 */

const ALLOWED_ORIGINS = new Set([
  'https://inhauslab.github.io',
  'https://inhaus-inspector.netlify.app'
]);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://inhauslab.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Forbidden', { status: 403 });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response('Forbidden origin', { status: 403 });
    }

    try {
      const body = await request.json();
      const { imageBase64, imageUrl, mimeType, prompt } = body;

      let base64 = imageBase64;
      let mime = mimeType || 'image/jpeg';

      // If imageUrl provided, fetch the image server-side
      if (!base64 && imageUrl) {
        const imgResp = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; InHausBot/1.0)',
            'Referer': 'https://inhauslab.github.io/',
          },
        });
        if (!imgResp.ok) {
          throw new Error(`Failed to fetch image: ${imgResp.status}`);
        }
        const imgBuffer = await imgResp.arrayBuffer();
        base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
        mime = imgResp.headers.get('content-type') || 'image/jpeg';
        // Strip parameters from mime type
        mime = mime.split(';')[0].trim();
      }

      if (!base64) throw new Error('No image data provided');

      // Call Anthropic API
      const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: prompt || 'Describe this image in one sentence.',
              },
            ],
          }],
        }),
      });

      const result = await anthropicResp.json();

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }
  },
};
