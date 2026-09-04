// Ponto Central do Sistema M.A.R.Y. (Orquestrador)

import { RobotFaceRenderer } from './robot/robotFace.js';
import { audioWave } from './robot/audioWave.js';
import { speechRecognizer } from './voice/speechToText.js';
import { ttsManager } from './voice/textToSpeech.js';
import { googleAuth } from './auth/googleAuth.js';
import { geminiService } from './ai/geminiService.js';

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
    this.googleClientIdInput = document.getElementById('google-client-id-input');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.modelIndicator = document.getElementById('model-indicator');

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
    const reply = await geminiService.sendMessage(text, userName);

    this.addChatMessage('mary', reply);
    this.speakMary(reply);
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
