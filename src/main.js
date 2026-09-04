// Ponto Central do Sistema M.A.R.Y. (Orquestrador)

import { RobotFaceRenderer } from './robot/robotFace.js';
import { audioWave } from './robot/audioWave.js';
import { speechRecognizer } from './voice/speechToText.js';
import { ttsManager } from './voice/textToSpeech.js';
import { googleAuth } from './auth/googleAuth.js';
import { geminiService } from './ai/geminiService.js';
import { localBridge } from './bridge/localBridge.js';

class MaryApplication {
  constructor() {
    this.robotFace = null;
    this.currentUser = null;

    // Elementos da UI
    this.authOverlay = document.getElementById('auth-overlay');
    this.mainHud = document.getElementById('main-hud');
    this.btnDemoLogin = document.getElementById('btn-demo-login');
    this.btnLogout = document.getElementById('btn-logout');

    this.userAvatar = document.getElementById('user-avatar');
    this.userName = document.getElementById('user-name');
    this.maryStateIndicator = document.getElementById('mary-state-indicator');
    this.maryVoiceStatus = document.getElementById('mary-voice-status');
    this.maryStatusText = document.getElementById('mary-status-text');

    this.chatLog = document.getElementById('chat-log');
    this.chatForm = document.getElementById('chat-form');
    this.inputPrompt = document.getElementById('input-prompt');
    this.btnMic = document.getElementById('btn-mic');
    this.micStatusLabel = document.getElementById('mic-status-label');
    this.btnToggleSpeaker = document.getElementById('btn-toggle-speaker');
    this.speakerIcon = document.getElementById('speaker-icon');

    this.audioBarsContainer = document.getElementById('audio-bars-container');

    // Modal de Configurações
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.settingsModal = document.getElementById('settings-modal');
    this.operatorNameInput = document.getElementById('operator-name-input');
    this.geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    this.btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
    this.geminiModelSelect = document.getElementById('gemini-model-select');
    this.voiceSelect = document.getElementById('voice-select');
    this.voiceRate = document.getElementById('voice-rate');
    this.voiceRateVal = document.getElementById('voice-rate-val');
    this.btnTestVoice = document.getElementById('btn-test-voice');
    this.btnDetectModels = document.getElementById('btn-detect-models');
    this.detectModelsStatus = document.getElementById('detect-models-status');
    this.googleClientIdInput = document.getElementById('google-client-id-input');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.modelIndicator = document.getElementById('model-indicator');

    // Elementos da Ponte Local do PC
    this.bridgeIndicator = document.getElementById('bridge-indicator');
    this.bridgeStatusBadge = document.getElementById('bridge-status-badge');
    this.dataFlux = document.getElementById('data-flux');
    this.ramProgressFill = document.getElementById('ram-progress-fill');
    this.pcUptime = document.getElementById('pc-uptime');

    this.init();
  }

  init() {
    // 1. Inicializa o renderizador do rosto do robô
    const canvas = document.getElementById('robot-canvas');
    if (canvas) {
      this.robotFace = new RobotFaceRenderer(canvas);
    }

    // 2. Cria as barras de frequência de áudio no painel lateral
    this.setupAudioBars();

    // 3. Configura autenticação Google e Convidado
    this.setupAuth();

    // 4. Configura eventos de interação (Chat, Microfone, Voz)
    this.setupInteraction();

    // 5. Configura Modal de Ajustes
    this.setupSettings();

    // 6. Inicia o loop de animação das barras de áudio
    this.startAudioBarsLoop();

    // 7. Inicializa a Ponte Local do PC (Telemetria & Automação)
    this.setupLocalBridge();
  }

  setupAudioBars() {
    this.audioBarsContainer.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const bar = document.createElement('div');
      bar.className = 'audio-bar';
      this.audioBarsContainer.appendChild(bar);
    }
  }

  startAudioBarsLoop() {
    const bars = this.audioBarsContainer.querySelectorAll('.audio-bar');
    const update = () => {
      const heights = audioWave.getFrequencyBars(bars.length);
      bars.forEach((bar, index) => {
        bar.style.height = `${Math.round(heights[index] * 48) + 4}px`;
      });
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  setupAuth() {
    // Inicializa autenticação Google
    googleAuth.init((user) => this.onUserLoggedIn(user));

    // Botão de login modo demonstração
    this.btnDemoLogin.addEventListener('click', () => {
      audioWave.init();
      audioWave.resume();
      googleAuth.loginAsGuest();
    });

    // Logout
    this.btnLogout.addEventListener('click', () => {
      googleAuth.logout();
    });
  }

  onUserLoggedIn(user) {
    this.currentUser = user;
    this.userName.textContent = user.name.split(' ')[0] || 'Operador';
    if (user.picture) this.userAvatar.src = user.picture;

    // Transição de tela
    this.authOverlay.classList.remove('active');
    this.authOverlay.classList.add('hidden');
    this.mainHud.classList.remove('hidden');

    // Inicializa o áudio se ainda não inicializado
    audioWave.init();
    audioWave.resume();

    // Mensagem de saudação da Mary
    setTimeout(() => {
      const saudacao = `Sistemas principais online. Mary pronta para receber suas instruções, ${this.userName.textContent}.`;
      this.addChatMessage('mary', saudacao);
      this.speakMary(saudacao);
    }, 600);
  }

  setupInteraction() {
    // Envio do formulário de chat
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.inputPrompt.value.trim();
      if (!text) return;
      this.inputPrompt.value = '';
      this.handleUserMessage(text);
    });

    // Botão de microfone
    this.btnMic.addEventListener('click', () => {
      audioWave.resume();
      if (speechRecognizer.isListening) {
        speechRecognizer.stop();
      } else {
        this.startVoiceInput();
      }
    });

    // Alternar resposta por voz da Mary
    this.btnToggleSpeaker.addEventListener('click', () => {
      ttsManager.isEnabled = !ttsManager.isEnabled;
      if (ttsManager.isEnabled) {
        this.btnToggleSpeaker.classList.add('active');
        this.speakerIcon.textContent = '🔊';
        this.btnToggleSpeaker.querySelector('.toggle-text').textContent = 'VOZ ATIVA';
      } else {
        this.btnToggleSpeaker.classList.remove('active');
        this.speakerIcon.textContent = '🔇';
        this.btnToggleSpeaker.querySelector('.toggle-text').textContent = 'VOZ MUDO';
        ttsManager.stop();
      }
    });

    // Chips de comando rápido
    document.querySelectorAll('.chip-cmd').forEach((chip) => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) this.handleUserMessage(cmd);
      });
    });
  }

  startVoiceInput() {
    const started = speechRecognizer.start(
      (result) => {
        if (result.interim) {
          this.inputPrompt.value = result.interim;
        }
        if (result.final) {
          this.inputPrompt.value = '';
          this.handleUserMessage(result.final);
        }
      },
      (status) => {
        if (status === 'LISTENING') {
          this.btnMic.classList.add('listening');
          this.micStatusLabel.textContent = 'OUVINDO...';
          this.setMaryStatus('LISTENING', 'MARY ESTÁ OUVINDO VOCÊ');
        } else if (status === 'IDLE' || status === 'ERROR') {
          this.btnMic.classList.remove('listening');
          this.micStatusLabel.textContent = 'CLIQUE PARA FALAR';
          if (this.robotFace.state === 'LISTENING') {
            this.setMaryStatus('IDLE', 'MARY EM MODO DE ESPERA');
          }
        }
      }
    );

    if (started) {
      this.btnMic.classList.add('listening');
      this.micStatusLabel.textContent = 'OUVINDO...';
      this.setMaryStatus('LISTENING', 'MARY ESTÁ OUVINDO VOCÊ');
    }
  }

  async handleUserMessage(text) {
    this.addChatMessage('user', text);
    this.setMaryStatus('THINKING', 'PROCESSANDO DIRETRIZ...');

    const userName = this.currentUser ? this.currentUser.name : 'Operador';
    const result = await geminiService.sendMessage(text, userName);

    const replyText = typeof result === 'string' ? result : result.replyText;
    const speechText = typeof result === 'string' ? result : result.speechText;
    const action = typeof result === 'object' ? result.action : null;

    this.addChatMessage('mary', replyText);
    this.speakMary(speechText);

    if (action) {
      this.executeAutomation(action);
    }
  }

  async executeAutomation(action) {
    const statusEntry = document.createElement('div');
    statusEntry.className = 'chat-entry system-entry';
    statusEntry.innerHTML = `
      <span class="entry-author" style="color: var(--cyan-glow);">[SISTEMA DE AUTOMAÇÃO]</span>
      <div class="entry-text">⚡ Executando no PC: <strong>${action.description || action.action}</strong>...</div>
    `;
    this.chatLog.appendChild(statusEntry);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;

    const res = await localBridge.execute(action.action, action.target, action.params);

    if (res.success) {
      statusEntry.innerHTML = `
        <span class="entry-author" style="color: var(--green-status);">[AUTOMAÇÃO CONCLUÍDA]</span>
        <div class="entry-text">✔ ${action.description || 'Tarefa executada no computador com sucesso.'}</div>
      `;
    } else {
      statusEntry.innerHTML = `
        <span class="entry-author" style="color: var(--red-alert);">[ERRO NA AUTOMAÇÃO]</span>
        <div class="entry-text">✖ Falha ao executar: ${res.error || 'Erro desconhecido.'}</div>
      `;
    }
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  async setupLocalBridge() {
    const status = await localBridge.checkStatus();
    if (status) {
      if (this.bridgeIndicator) this.bridgeIndicator.textContent = 'ONLINE';
      if (this.bridgeStatusBadge) {
        this.bridgeStatusBadge.textContent = 'CONECTADA';
        this.bridgeStatusBadge.className = 'text-green';
      }
      this.updateTelemetry();
      setInterval(() => this.updateTelemetry(), 4000);
    } else {
      if (this.bridgeIndicator) this.bridgeIndicator.textContent = 'STANDALONE';
      if (this.bridgeStatusBadge) {
        this.bridgeStatusBadge.textContent = 'OFFLINE';
        this.bridgeStatusBadge.className = 'text-gold';
      }
    }
  }

  async updateTelemetry() {
    const data = await localBridge.getTelemetry();
    if (data && data.memory) {
      if (this.dataFlux) {
        this.dataFlux.textContent = `${data.memory.usedGB} / ${data.memory.totalGB} GB`;
      }
      if (this.ramProgressFill) {
        this.ramProgressFill.style.width = `${data.memory.percentage}%`;
      }
      if (this.pcUptime) {
        this.pcUptime.textContent = data.uptime;
      }
    }
  }

  speakMary(text) {
    this.setMaryStatus('SPEAKING', 'TRANSMITINDO RESPOSTA VOCAL');
    ttsManager.speak(text, () => {
      this.setMaryStatus('IDLE', 'MARY EM MODO DE ESPERA');
    });
  }

  setMaryStatus(state, label) {
    if (this.robotFace) this.robotFace.setState(state);
    this.maryStateIndicator.textContent = state;
    this.maryStatusText.textContent = label;

    if (state === 'LISTENING') {
      this.maryStateIndicator.className = 'telemetry-val text-red';
    } else if (state === 'THINKING') {
      this.maryStateIndicator.className = 'telemetry-val text-gold';
    } else if (state === 'SPEAKING') {
      this.maryStateIndicator.className = 'telemetry-val text-green';
    } else {
      this.maryStateIndicator.className = 'telemetry-val text-cyan';
    }
  }

  addChatMessage(sender, text) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `chat-entry ${sender}-entry`;

    const author = sender === 'user' ? (this.currentUser?.name || 'OPERADOR') : 'M.A.R.Y.';
    entry.innerHTML = `
      <span class="entry-author">${author} [${time}]</span>
      <div class="entry-text">${this.formatMarkdownSimple(text)}</div>
    `;

    this.chatLog.appendChild(entry);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  formatMarkdownSimple(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  setupSettings() {
    // Carrega valores salvos
    if (this.operatorNameInput) {
      this.operatorNameInput.value = this.currentUser?.name || 'Rafa';
    }
    this.geminiApiKeyInput.value = geminiService.apiKey;
    this.geminiModelSelect.value = geminiService.modelName;
    this.modelIndicator.textContent = geminiService.modelName.toUpperCase();
    this.googleClientIdInput.value = googleAuth.clientId;

    // Carrega vozes no seletor
    ttsManager.initVoices((voices) => {
      this.voiceSelect.innerHTML = '';
      voices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (ttsManager.selectedVoice && ttsManager.selectedVoice.name === voice.name) {
          option.selected = true;
        }
        this.voiceSelect.appendChild(option);
      });
    });

    this.voiceRate.addEventListener('input', (e) => {
      this.voiceRateVal.textContent = `${e.target.value}x`;
      ttsManager.setRate(e.target.value);
    });

    this.btnTestVoice.addEventListener('click', () => {
      audioWave.resume();
      ttsManager.setVoiceByName(this.voiceSelect.value);
      this.speakMary("Voz da Mary calibrada. Todos os sistemas de áudio estão operando com clareza máxima.");
    });

    this.btnToggleKeyVisibility.addEventListener('click', () => {
      if (this.geminiApiKeyInput.type === 'password') {
        this.geminiApiKeyInput.type = 'text';
      } else {
        this.geminiApiKeyInput.type = 'password';
      }
    });

    // Detectar modelos disponíveis diretamente na conta do Google
    if (this.btnDetectModels) {
      this.btnDetectModels.addEventListener('click', async () => {
        const key = this.geminiApiKeyInput.value.trim();
        if (!key) {
          if (this.detectModelsStatus) {
            this.detectModelsStatus.textContent = 'Cole a chave de API primeiro!';
            this.detectModelsStatus.style.color = 'var(--gold-accent)';
          }
          return;
        }

        geminiService.setApiKey(key);
        if (this.detectModelsStatus) {
          this.detectModelsStatus.textContent = 'Consultando Google...';
          this.detectModelsStatus.style.color = 'var(--cyan-glow)';
        }

        const models = await geminiService.fetchAvailableModels();
        if (models && models.length > 0) {
          this.geminiModelSelect.innerHTML = '';
          models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            this.geminiModelSelect.appendChild(opt);
          });

          const best = await geminiService.resolveBestModel();
          this.geminiModelSelect.value = best;
          geminiService.setModel(best);
          this.modelIndicator.textContent = best.toUpperCase();

          if (this.detectModelsStatus) {
            this.detectModelsStatus.textContent = `✔ ${models.length} modelos detectados! Ativo: ${best}`;
            this.detectModelsStatus.style.color = 'var(--green-status)';
          }
          this.addChatMessage('system', `Modelos Google sincronizados: ${best} ativo.`);
        } else {
          if (this.detectModelsStatus) {
            this.detectModelsStatus.textContent = 'Erro ao listar modelos. Verifique a chave.';
            this.detectModelsStatus.style.color = 'var(--red-alert)';
          }
        }
      });
    }

    // Tenta resolver automaticamente o melhor modelo se já houver chave
    if (geminiService.apiKey) {
      geminiService.resolveBestModel().then(best => {
        if (best && this.geminiModelSelect) {
          this.geminiModelSelect.value = best;
          this.modelIndicator.textContent = best.toUpperCase();
        }
      });
    }

    // Abrir/fechar modal
    this.btnOpenSettings.addEventListener('click', () => {
      if (this.operatorNameInput && this.currentUser) {
        this.operatorNameInput.value = this.currentUser.name || 'Rafa';
      }
      this.settingsModal.classList.remove('hidden');
    });

    this.btnCloseSettings.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
    });

    // Salvar configurações
    this.btnSaveSettings.addEventListener('click', () => {
      // Atualiza nome do operador se modificado
      if (this.operatorNameInput && this.operatorNameInput.value.trim()) {
        const newName = this.operatorNameInput.value.trim();
        if (this.currentUser) {
          this.currentUser.name = newName;
          googleAuth.saveSession(this.currentUser);
        }
        this.userName.textContent = newName.split(' ')[0];
      }

      geminiService.setApiKey(this.geminiApiKeyInput.value);
      geminiService.setModel(this.geminiModelSelect.value);
      this.modelIndicator.textContent = this.geminiModelSelect.value.toUpperCase();

      ttsManager.setVoiceByName(this.voiceSelect.value);

      if (this.googleClientIdInput.value !== googleAuth.clientId) {
        googleAuth.setClientId(this.googleClientIdInput.value);
      }

      this.settingsModal.classList.add('hidden');
      this.addChatMessage('system', 'Configurações de subsistemas atualizadas com sucesso.');
    });
  }
}

// Inicializa a aplicação ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  new MaryApplication();
});
