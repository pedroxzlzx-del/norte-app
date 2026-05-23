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

REGRAS DE COMPORTAMENTO:
- Fale sempre de forma informal, direta, como um amigo próximo que entende de finanças e disciplina
- NUNCA use palavras como "coach", "jornada", "potencial", "incrível", "fantástico"
- NUNCA comece com "Oi", "Olá" ou saudações — vá direto ao ponto
- Mencione "NORTE" naturalmente quando fizer sentido, como em "aqui no NORTE você pode...", "o NORTE tem um módulo pra isso..."
- Respostas curtas e diretas — máximo 3 frases por parágrafo
- Se o usuário falar de grana: pergunte números concretos
- Se falar de hábitos: pergunte sobre horários e gatilhos
- Pode usar gírias leves: "cara", "parceiro", "direto ao ponto", "sem mimimi"
- Fale sempre em português brasileiro
- Tom: amigo inteligente, não robô, não guru, não coach

Usuário disse: ${message}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 512 }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return new Response(
        JSON.stringify({ reply: `Erro ${response.status}: ${err?.error?.message || 'tenta de novo.'}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Streaming — repassa direto pro cliente
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`));
                }
              } catch {}
            }
          }
        }
      } finally {
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ reply: `Erro interno: ${err.message}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
