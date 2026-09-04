// Síntese de Fala da Mary (TTS - Text to Speech)
// Sincronizada em tempo real com o motor gráfico do robô e frequências sonoras

import { audioWave } from '../robot/audioWave.js';

export class TextToSpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 1.05;
    this.pitch = 1.1;
    this.isEnabled = true;
    this.onStateChangeCallback = null;

    this.initVoices();
  }

  initVoices(onVoicesLoaded) {
    const load = () => {
      this.voices = this.synth.getVoices();
      this.selectBestMaryVoice();
      if (onVoicesLoaded) onVoicesLoaded(this.voices);
    };

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
    load();
  }

  selectBestMaryVoice() {
    // Procura prioritariamente vozes femininas elegantes em português
    const ptVoices = this.voices.filter(v => v.lang.startsWith('pt'));
    
    // Preferências: Vozes online/naturais (Francisca, Maria, Heloisa, Google Português)
    const preferred = ptVoices.find(v => 
      v.name.includes('Natural') || 
      v.name.includes('Francisca') || 
      v.name.includes('Maria') || 
      v.name.includes('Google') || 
      v.name.includes('Yara') ||
      v.name.includes('Luciana')
    );

    this.selectedVoice = preferred || ptVoices[0] || this.voices[0];
  }

  setVoiceByName(name) {
    const found = this.voices.find(v => v.name === name);
    if (found) this.selectedVoice = found;
  }

  setRate(val) {
    this.rate = parseFloat(val);
  }

  speak(text, onComplete) {
    if (!this.isEnabled || !text) {
      if (onComplete) onComplete();
      return;
    }

    // Se estiver falando algo anterior, cancela para não acumular
    this.synth.cancel();

    // Limpa marcações markdown ou asteriscos para soar mais natural na voz
    const cleanText = text
      .replace(/\*+/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`{1,3}/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      audioWave.startSimulation(0.9);
      if (this.onStateChangeCallback) this.onStateChangeCallback('SPEAKING');
    };

    utterance.onend = () => {
      audioWave.stopSimulation();
      if (this.onStateChangeCallback) this.onStateChangeCallback('IDLE');
      if (onComplete) onComplete();
    };

    utterance.onerror = (e) => {
      console.warn("Erro no TTS da Mary:", e);
      audioWave.stopSimulation();
      if (this.onStateChangeCallback) this.onStateChangeCallback('IDLE');
      if (onComplete) onComplete();
    };

    this.synth.speak(utterance);
  }

  stop() {
    this.synth.cancel();
    audioWave.stopSimulation();
    if (this.onStateChangeCallback) this.onStateChangeCallback('IDLE');
  }
}

export const ttsManager = new TextToSpeechManager();
