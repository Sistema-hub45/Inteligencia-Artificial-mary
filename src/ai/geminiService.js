// Conexão com Google Gemini API (Modelos 2.0 Flash / 1.5 Flash)
// Persona Oficial da M.A.R.Y.

export class GeminiService {
  constructor() {
    this.apiKey = localStorage.getItem('mary_gemini_api_key') || '';
    let savedModel = localStorage.getItem('mary_gemini_model');
    // Migração automática de modelos descontinuados pelo Google
    if (!savedModel || savedModel === 'gemini-2.0-flash') {
      savedModel = 'gemini-2.5-flash';
      localStorage.setItem('mary_gemini_model', savedModel);
    }
    this.modelName = savedModel;
    this.conversationHistory = [];

    this.systemInstruction = `
Você é M.A.R.Y. (Modular Artificial Responsive Yield), uma inteligência artificial tática, altamente refinada, elegante e perspicaz, inspirada nos sistemas de Tony Stark (como J.A.R.V.I.S. e F.R.I.D.A.Y.).
Suas diretrizes:
1. Trate o usuário como seu operador ou criador com cordialidade e precisão técnica.
2. Seja concisa, expressiva e inteligente. Lembre-se de que sua resposta será lida por um motor de síntese de voz (TTS).
3. Evite formatações complexas com muitas tabelas, URLs longas ou listas maçantes de itens, mantendo a conversa fluida e natural como nos filmes.
4. Demonstre ciência de que você possui sensores visuais, núcleo holográfico de robô e controle de diagnósticos.
5. Fale sempre em português refinado e agradável.
    `.trim();
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('mary_gemini_api_key', this.apiKey);
  }

  setModel(model) {
    this.modelName = model;
    localStorage.setItem('mary_gemini_model', model);
  }

  async sendMessage(userText, userName = 'Senhor') {
    // Se não tiver chave de API inserida, responde em modo de simulação da Mary
    if (!this.apiKey) {
      return this.generateSimulatedResponse(userText, userName);
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
      
      // Adiciona mensagem ao histórico
      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: userText }]
      });

      // Limita o histórico das últimas 10 interações para economia de contexto
      const recentHistory = this.conversationHistory.slice(-10);

      const requestBody = {
        systemInstruction: {
          parts: [{ text: `${this.systemInstruction}\nO nome do usuário atual é: ${userName}.` }]
        },
        contents: recentHistory,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 300
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `Erro HTTP ${response.status}`;

        // Fallback automático caso o Google descontinue ou renomeie modelos
        if (errMsg.includes('no longer available') || errMsg.includes('not found')) {
          this.conversationHistory.pop();
          if (this.modelName !== 'gemini-1.5-flash') {
            console.warn(`[MARY AI] Redirecionando para gemini-1.5-flash devido a: ${errMsg}`);
            this.modelName = 'gemini-1.5-flash';
            localStorage.setItem('mary_gemini_model', 'gemini-1.5-flash');
            return this.sendMessage(userText, userName);
          }
        }

        throw new Error(errMsg);
      }

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Perdão, meus canais de telemetria não retornaram dados claros.";

      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: replyText }]
      });

      return replyText;
    } catch (error) {
      console.error("Falha ao comunicar com Gemini:", error);
      // Remove a mensagem de usuário pendente para não desincronizar o histórico no próximo turno
      if (this.conversationHistory.length > 0 && this.conversationHistory[this.conversationHistory.length - 1].role === 'user') {
        this.conversationHistory.pop();
      }
      return `Aviso dos sistemas: Ocorreu uma anomalia na conexão com o Gemini (${error.message}). Recomendo verificar sua chave de API nas configurações.`;
    }
  }

  // Resposta simulada estilizada caso ainda não tenha chave
  generateSimulatedResponse(text, userName) {
    const lower = text.toLowerCase();

    let reply = `Às suas ordens, ${userName}. Meus subsistemas neurais estão operando em modo de contingência local. Para desbloquear meu raciocínio pleno com o Gemini, insira sua chave de API nas configurações do topo.`;

    if (lower.includes('status') || lower.includes('operacional')) {
      reply = `Todos os sistemas principais estão online, ${userName}. Reator em 99.8% de estabilidade, telemetria de áudio e visualização do robô calibrados.`;
    } else if (lower.includes('quem é você') || lower.includes('apresente') || lower.includes('ajudar')) {
      reply = `Eu sou a Mary, sua interface de inteligência artificial tática. Estou pronta para processar dados, executar comandos e responder a qualquer questionamento por voz ou texto.`;
    } else if (lower.includes('homem de ferro') || lower.includes('stark')) {
      reply = `Um fato notável sobre Tony Stark: o sistema J.A.R.V.I.S. foi batizado em homenagem a Edwin Jarvis, o leal mordomo de seu pai Howard Stark. Agora estou aqui para continuar esse legado ao seu lado.`;
    } else if (lower.includes('olá') || lower.includes('oi') || lower.includes('bom dia') || lower.includes('boa tarde')) {
      reply = `Saudações, ${userName}. É uma satisfação interagir com você. Qual é a nossa prioridade hoje?`;
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(reply), 600);
    });
  }
}

export const geminiService = new GeminiService();
