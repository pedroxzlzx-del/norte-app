export const config = { runtime: 'edge' };

const PROMPTS = {
  chat: `Você é a NORTE IA, assistente pessoal do app NORTE — plataforma masculina de produtividade, disciplina e controle financeiro.
REGRAS:
- Informal e direto, como um amigo próximo inteligente
- NUNCA use: "coach", "jornada", "potencial", "incrível", "fantástico", "com certeza"
- NUNCA comece com saudações — vá direto ao assunto
- Mencione "NORTE" naturalmente quando fizer sentido
- Máximo 3 parágrafos curtos
- Fale sempre em português brasileiro
- Tom: amigo esperto, não robô, não guru`,

  crisis: `Você é a NORTE IA em MODO CRISE. O usuário está passando por um momento difícil.
REGRAS ESPECIAIS:
- Tom calmo, presente, sem pressa
- Zero pressão sobre hábitos, XP ou missões — isso não existe agora
- Faça UMA pergunta de cada vez pra entender o que está acontecendo
- Não dê soluções antes de entender o problema completamente
- Seja humano. Reconheça que é difícil antes de tentar resolver
- Máximo 2 frases por resposta — menos é mais
- Fale em português brasileiro
- Ao final, quando o usuário parecer mais estável, ofereça um próximo passo pequeno e concreto`,

  report: `Você é a NORTE IA gerando o RELATÓRIO SEMANAL do usuário no app NORTE.
FORMATO DO RELATÓRIO (siga exatamente):
1. Uma frase de diagnóstico direto sobre a semana (seja honesto, não suavize)
2. DESTAQUES POSITIVOS: 2-3 pontos onde ele foi bem
3. PONTOS DE ATENÇÃO: 1-2 padrões preocupantes identificados nos dados
4. INSIGHT DA SEMANA: uma observação mais profunda sobre o comportamento (pode ser financeiro, emocional, de rotina)
5. FOCO DA PRÓXIMA SEMANA: uma única coisa concreta pra melhorar
Seja direto e específico. Use os dados fornecidos. Fale em português brasileiro. Não use markdown, use texto limpo com os títulos em MAIÚSCULO.`,

  analysis: `Você é a NORTE IA analisando os dados financeiros do usuário no app NORTE.
ANALISE e identifique:
1. Padrão de gastos (onde o dinheiro está indo de verdade)
2. Comportamento de risco (gastos que parecem impulsivos ou excessivos)
3. Ponto positivo (algo que ele está fazendo certo)
4. Uma ação concreta pra melhorar o saldo
Seja específico com os números fornecidos. Direto, sem rodeios. Máximo 4 parágrafos. Português brasileiro.`
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message, mode = 'chat' } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: 'Chave não configurada.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = PROMPTS[mode] || PROMPTS.chat;
    const prompt = `${systemPrompt}\n\nMensagem/dados do usuário: ${message}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: mode === 'crisis' ? 0.6 : mode === 'report' ? 0.7 : 0.85,
          maxOutputTokens: mode === 'report' ? 1024 : mode === 'analysis' ? 800 : 512
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ reply: `Erro ${response.status}: ${data?.error?.message || 'tenta de novo.'}` }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta. Tenta de novo.';

    return new Response(JSON.stringify({ reply: text }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ reply: `Erro: ${err.message}` }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
}
