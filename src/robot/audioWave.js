// Gerenciador de Análise de Áudio em Tempo Real (Web Audio API)

class AudioWaveManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.isSimulating = false;
    this.simulationIntensity = 0;
    this.numBars = 16;
  }

  init() {
    if (this.audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (e) {
      console.warn("Web Audio API não suportada ou bloqueada:", e);
    }
  }

  // Ativa o áudio context se o navegador tiver bloqueado por falta de interação
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Simula intensidade de áudio durante fala ou escuta da Mary
  startSimulation(intensity = 0.8) {
    this.isSimulating = true;
    this.simulationIntensity = intensity;
  }

  stopSimulation() {
    this.isSimulating = false;
    this.simulationIntensity = 0;
  }

  // Retorna um valor normalizado de 0 a 1 representando a intensidade sonora atual
  getIntensity() {
    if (this.isSimulating) {
      // Gera oscilação harmônica dinâmica simulando fala humana
      const t = performance.now() * 0.008;
      const noise = (Math.sin(t * 1.5) + Math.cos(t * 3.2) + Math.sin(t * 5.1)) / 3;
      return Math.max(0.1, Math.min(1.0, (0.5 + noise * 0.4) * this.simulationIntensity));
    }

    if (!this.analyser || !this.dataArray) return 0.05;

    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const avg = sum / this.dataArray.length;
    return avg / 255;
  }

  // Retorna um array de alturas para barras de espectro
  getFrequencyBars(count = 14) {
    const bars = [];
    const intensity = this.getIntensity();
    const time = performance.now() * 0.005;

    for (let i = 0; i < count; i++) {
      let val;
      if (this.isSimulating) {
        val = Math.abs(Math.sin(time + i * 0.4)) * 0.8 * this.simulationIntensity + 0.1;
      } else {
        val = 0.08 + Math.random() * 0.05;
      }
      bars.push(Math.min(1, Math.max(0.08, val)));
    }
    return bars;
  }
}

export const audioWave = new AudioWaveManager();
