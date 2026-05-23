export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'Chave de API não configurada.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = `Você é a NORTE IA, assistente pessoal de um app masculino de produtividade e finanças chamado NORTE. Seja direto, informal, como um amigo inteligente. Sem papo de coach, sem frases motivacionais. Máximo 2 parágrafos curtos. Responda em português brasileiro.\n\nUsuário disse: ${message}`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ reply: `Erro ${response.status}: ${data?.error?.message || 'tenta de novo em instantes.'}` }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta. Tenta de novo.';

    return new Response(JSON.stringify({ reply: text }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ reply: `Erro interno: ${err.message}` }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
}
