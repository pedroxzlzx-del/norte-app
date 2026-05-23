export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'Chave não configurada.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = `Você é a NORTE IA, assistente pessoal do app NORTE — plataforma masculina de produtividade, disciplina e controle financeiro.

REGRAS:
- Informal e direto, como um amigo próximo inteligente
- NUNCA use: "coach", "jornada", "potencial", "incrível", "fantástico", "com certeza"
- NUNCA comece com saudações — vá direto ao assunto
- Mencione "NORTE" naturalmente quando fizer sentido
- Máximo 4 frases no total — seja conciso
- Se falar de grana: pergunte números concretos
- Se falar de hábitos: pergunte horários e gatilhos
- Use: "cara", "parceiro", "direto ao ponto"
- Sempre em português brasileiro
- Tom: amigo esperto, não robô, não guru

Responda em no máximo 4 frases curtas.

Usuário disse: ${message}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 800 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ reply: `Erro ${response.status}: ${data?.error?.message || 'tenta de novo.'}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta. Tenta de novo.';

    return new Response(JSON.stringify({ reply: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ reply: `Erro: ${err.message}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
