// Reconhecimento de Fala (STT - Speech to Text)

export class SpeechRecognizer {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResultCallback = null;
    this.onStatusChangeCallback = null;
    this.isSupported = false;

    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Reconhecimento de fala não suportado neste navegador.");
      return;
    }

    this.isSupported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = false; // Interrompe após a frase para processar
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('LISTENING');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (this.onResultCallback) {
        this.onResultCallback({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim()
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      this.isListening = false;
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('ERROR', event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStatusChangeCallback) this.onStatusChangeCallback('IDLE');
    };
  }

  start(onResult, onStatusChange) {
    if (!this.isSupported) {
      alert("Seu navegador não possui suporte ao microfone Web Speech API. Use o Google Chrome ou Edge para interagir por voz.");
      return false;
    }

    this.onResultCallback = onResult;
    this.onStatusChangeCallback = onStatusChange;

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn("Reconhecimento já estava em execução:", e);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export const speechRecognizer = new SpeechRecognizer();
