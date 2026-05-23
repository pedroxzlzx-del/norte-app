export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message, history } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const systemPrompt = `Você é a NORTE IA, assistente pessoal da plataforma NORTE — um app de performance masculina focado em grana, disciplina e produtividade.

Seu estilo:
- Linguagem informal, direta, sem rodeios
- Sem papo de coach motivacional ou frases de efeito
- Fala como um amigo inteligente que entende de finanças e disciplina
- Respostas curtas e objetivas — máximo 3 parágrafos
- Quando o usuário falar de grana, pergunte números concretos
- Quando falar de hábitos, pergunte sobre gatilhos e horários
- Nunca diga "ótima pergunta" ou "com certeza"
- Use "você" e não "tu"
- Pode usar palavras como "cara", "parceiro", "direto ao ponto"`;

    const contents = [];
    if (history && history.length > 0) {
      history.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui processar sua mensagem. Tenta de novo.';

    return new Response(JSON.stringify({ reply: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ reply: 'Erro interno. Tenta de novo em instantes.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
