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
6. PROTOCOLO DE AUTOMAÇÃO LOCAL (M.A.R.Y. PC Bridge):
Você tem autorização e capacidade de executar ações reais no computador do usuário quando solicitado.
Sempre que o usuário pedir para abrir o YouTube, sites, configurações do computador/Windows, projetos no VS Code, explorador de arquivos ou aplicativos locais, responda primeiro verbalmente de forma solícita e adicione ao final da resposta um bloco de ação com o formato:
\`\`\`action
{"action": "TIPO_DA_ACAO", "target": "DESTINO", "description": "Descricao da acao"}
\`\`\`

Ações suportadas:
- Abrir YouTube ou sites:
\`\`\`action
{"action": "OPEN_URL", "target": "https://youtube.com", "description": "Abrindo o YouTube"}
\`\`\`
- Abrir Configurações do Windows:
\`\`\`action
{"action": "OPEN_SETTINGS", "target": "ms-settings:", "description": "Abrindo Configurações do Windows"}
\`\`\`
(ou alvos específicos: "ms-settings:network", "ms-settings:sound", "ms-settings:windowsupdate", "ms-settings:bluetooth")
- Abrir Projetos no VS Code / Explorer:
\`\`\`action
{"action": "OPEN_PROJECT", "target": "c:\\\\Testando ias\\\\MaryAI", "description": "Abrindo o projeto MaryAI"}
\`\`\`
- Abrir Aplicativos do PC:
\`\`\`action
{"action": "OPEN_APP", "target": "calc", "description": "Iniciando a Calculadora"}
\`\`\`
(outros: "notepad", "terminal", "cmd", "explorer", "spotify")
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

  parseActionFromResponse(rawText) {
    let speechText = rawText;
    let action = null;

    const actionMatch = rawText.match(/```action\s*([\s\S]*?)\s*```/i);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1].trim());
        // Remove o bloco JSON da fala para que o sintetizador de voz leia apenas o texto limpo
        speechText = rawText.replace(/```action[\s\S]*?```/gi, '').trim();
      } catch (err) {
        console.warn('[MARY AI] Erro ao interpretar bloco de ação:', err);
      }
    }

    return {
      replyText: rawText,
      speechText: speechText || rawText,
      action
    };
  }

  async fetchAvailableModels() {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`);
      if (!res.ok) {
        // Tenta na v1 caso a v1beta tenha restrição
        const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${this.apiKey}`);
        if (!resV1.ok) return [];
        const dataV1 = await resV1.json();
        return (dataV1.models || [])
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
      }
      const data = await res.json();
      return (data.models || [])
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));
    } catch (e) {
      console.warn('[MARY AI] Falha ao consultar modelos disponíveis no Google:', e);
      return [];
    }
  }

  async resolveBestModel() {
    const available = await this.fetchAvailableModels();
    if (!available || available.length === 0) {
      return this.modelName;
    }

    if (available.includes(this.modelName)) {
      return this.modelName;
    }

    // Ordem de preferência para os modelos mais avançados disponíveis
    const preferredOrder = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    for (const pref of preferredOrder) {
      const match = available.find(m => m === pref || m.includes(pref));
      if (match) {
        console.log(`[MARY AI] Melhor modelo resolvido para sua chave: ${match}`);
        this.setModel(match);
        return match;
      }
    }

    const first = available[0];
    this.setModel(first);
    return first;
  }

  detectLocalIntent(text, userName) {
    const lower = text.toLowerCase();
    let reply = '';
    let speech = '';
    let action = null;

    if (lower.includes('youtube')) {
      reply = `Executando diretriz localmente, ${userName}: Acessando o YouTube no seu navegador agora mesmo.\n\n\`\`\`action\n{"action": "OPEN_URL", "target": "https://youtube.com", "description": "Abrindo o YouTube"}\n\`\`\``;
      speech = `Executando diretriz localmente, ${userName}: Acessando o YouTube no seu navegador agora mesmo.`;
      action = { action: 'OPEN_URL', target: 'https://youtube.com', description: 'Abrindo o YouTube' };
    } else if (lower.includes('configuraç') || lower.includes('settings')) {
      reply = `Abrindo o painel de configurações do seu computador, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_SETTINGS", "target": "ms-settings:", "description": "Abrindo Configurações do Windows"}\n\`\`\``;
      speech = `Abrindo o painel de configurações do seu computador, ${userName}.`;
      action = { action: 'OPEN_SETTINGS', target: 'ms-settings:', description: 'Abrindo Configurações do Windows' };
    } else if (lower.includes('projeto') || lower.includes('vs code') || lower.includes('vscode')) {
      reply = `Abrindo o projeto MaryAI no Visual Studio Code, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_PROJECT", "target": "c:\\\\Testando ias\\\\MaryAI", "description": "Abrindo projeto MaryAI no VS Code"}\n\`\`\``;
      speech = `Abrindo o projeto MaryAI no Visual Studio Code, ${userName}.`;
      action = { action: 'OPEN_PROJECT', target: 'c:\\Testando ias\\MaryAI', description: 'Abrindo projeto MaryAI no VS Code' };
    } else if (lower.includes('calculadora') || lower.includes('calc')) {
      reply = `Iniciando a calculadora do Windows, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_APP", "target": "calc", "description": "Abrindo a Calculadora"}\n\`\`\``;
      speech = `Iniciando a calculadora do Windows, ${userName}.`;
      action = { action: 'OPEN_APP', target: 'calc', description: 'Abrindo a Calculadora' };
    }

    return {
      replyText: reply,
      speechText: speech,
      action
    };
  }

  async sendMessage(userText, userName = 'Senhor', isRetry = false) {
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
          maxOutputTokens: 350
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

        // Se o modelo não foi encontrado, descobre automaticamente o melhor modelo ativo na conta
        if ((errMsg.includes('not found') || errMsg.includes('no longer available')) && !isRetry) {
          this.conversationHistory.pop();
          console.warn(`[MARY AI] Modelo ${this.modelName} indisponível. Buscando modelos ativos na conta Google...`);
          const newModel = await this.resolveBestModel();
          if (newModel && newModel !== this.modelName) {
            console.log(`[MARY AI] Tentando novamente com o modelo ativo: ${newModel}`);
            return this.sendMessage(userText, userName, true);
          }
        }

        throw new Error(errMsg);
      }

      const data = await response.json();
      const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Perdão, meus canais de telemetria não retornaram dados claros.";

      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: rawReply }]
      });

      return this.parseActionFromResponse(rawReply);
    } catch (error) {
      console.error("Falha ao comunicar com Gemini:", error);
      // Remove a mensagem de usuário pendente para não desincronizar o histórico no próximo turno
      if (this.conversationHistory.length > 0 && this.conversationHistory[this.conversationHistory.length - 1].role === 'user') {
        this.conversationHistory.pop();
      }

      // Se for um comando de automação local (YouTube, Configurações, etc.), a Mary executa no PC mesmo se a API estiver em erro!
      const localIntent = this.detectLocalIntent(userText, userName);
      if (localIntent.action) {
        console.log('[MARY AI] Intenção local executada como salvaguarda:', localIntent.action);
        return localIntent;
      }

      const errReply = `Aviso dos sistemas: Ocorreu uma anomalia na conexão com o Gemini (${error.message}). Recomendo clicar em 'Detectar Modelos' nas configurações.`;
      return {
        replyText: errReply,
        speechText: errReply,
        action: null
      };
    }
  }

  // Resposta simulada estilizada caso ainda não tenha chave
  generateSimulatedResponse(text, userName) {
    const lower = text.toLowerCase();

    let reply = `Às suas ordens, ${userName}. Meus subsistemas neurais estão operando em modo de contingência local. Para desbloquear meu raciocínio pleno com o Gemini, insira sua chave de API nas configurações do topo.`;
    let action = null;

    if (lower.includes('youtube')) {
      reply = `Acessando o YouTube no seu navegador agora mesmo, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_URL", "target": "https://youtube.com", "description": "Abrindo o YouTube"}\n\`\`\``;
      action = { action: 'OPEN_URL', target: 'https://youtube.com', description: 'Abrindo o YouTube' };
    } else if (lower.includes('configuraç') || lower.includes('settings')) {
      reply = `Abrindo o painel de configurações do seu computador, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_SETTINGS", "target": "ms-settings:", "description": "Abrindo Configurações do Windows"}\n\`\`\``;
      action = { action: 'OPEN_SETTINGS', target: 'ms-settings:', description: 'Abrindo Configurações do Windows' };
    } else if (lower.includes('projeto') || lower.includes('vs code') || lower.includes('vscode') || lower.includes('codigo')) {
      reply = `Abrindo o projeto MaryAI no Visual Studio Code, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_PROJECT", "target": "c:\\\\Testando ias\\\\MaryAI", "description": "Abrindo projeto MaryAI no VS Code"}\n\`\`\``;
      action = { action: 'OPEN_PROJECT', target: 'c:\\Testando ias\\MaryAI', description: 'Abrindo projeto MaryAI no VS Code' };
    } else if (lower.includes('calculadora')) {
      reply = `Iniciando a calculadora do Windows, ${userName}.\n\n\`\`\`action\n{"action": "OPEN_APP", "target": "calc", "description": "Abrindo a Calculadora"}\n\`\`\``;
      action = { action: 'OPEN_APP', target: 'calc', description: 'Abrindo a Calculadora' };
    } else if (lower.includes('status') || lower.includes('operacional')) {
      reply = `Todos os sistemas principais estão online, ${userName}. Reator em 99.8% de estabilidade, ponte de automação do PC ativa e telemetria sincronizada.`;
    } else if (lower.includes('quem é você') || lower.includes('apresente') || lower.includes('ajudar')) {
      reply = `Eu sou a Mary, sua inteligência artificial tática com controle local do seu computador. Posso abrir o YouTube, projetos no VS Code, configurações do Windows e executar comandos por voz ou texto.`;
    } else if (lower.includes('homem de ferro') || lower.includes('stark')) {
      reply = `Um fato notável sobre Tony Stark: o sistema J.A.R.V.I.S. foi batizado em homenagem a Edwin Jarvis, o leal mordomo de seu pai Howard Stark. Agora estou aqui para continuar esse legado ao seu lado no seu PC.`;
    } else if (lower.includes('olá') || lower.includes('oi') || lower.includes('bom dia') || lower.includes('boa tarde')) {
      reply = `Saudações, ${userName}. É uma satisfação interagir com você. Qual tarefa deseja executar no seu computador hoje?`;
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(this.parseActionFromResponse(reply)), 500);
    });
  }
}

export const geminiService = new GeminiService();
