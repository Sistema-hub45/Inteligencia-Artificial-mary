// Motor de Efeitos Holográficos e Overlay de Áudio sobre o Rosto Realista da Mary
// Renderizado via Canvas em 60 FPS com reatividade sonora

import { audioWave } from './audioWave.js';

export class RobotFaceRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'IDLE'; // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING'
    this.animationFrameId = null;
    this.particles = [];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Cria partículas de energia holográfica ao redor
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 440,
        y: (Math.random() - 0.5) * 440,
        size: Math.random() * 2 + 0.8,
        speed: Math.random() * 0.4 + 0.15,
        opacity: Math.random() * 0.7 + 0.3,
        angle: Math.random() * Math.PI * 2
      });
    }

    this.start();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 440;
    this.height = rect.height || 440;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setState(newState) {
    this.state = newState;
    const wrapper = document.getElementById('robot-portrait-wrapper');
    if (wrapper) {
      wrapper.classList.remove('speaking', 'listening', 'thinking');
      if (newState === 'SPEAKING') wrapper.classList.add('speaking');
      if (newState === 'LISTENING') wrapper.classList.add('listening');
      if (newState === 'THINKING') wrapper.classList.add('thinking');
    }
  }

  start() {
    const loop = (timestamp) => {
      this.render(timestamp);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  render(t) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const audioIntensity = audioWave.getIntensity();

    // Cores de acordo com o estado operacional
    let primaryColor = '#00f0ff';
    let secondaryColor = '#0080ff';

    if (this.state === 'LISTENING') {
      primaryColor = '#ff3366';
      secondaryColor = '#ff0055';
    } else if (this.state === 'THINKING') {
      primaryColor = '#ffb703';
      secondaryColor = '#fb8500';
    } else if (this.state === 'SPEAKING') {
      primaryColor = '#00ffcc';
      secondaryColor = '#00e5ff';
    }

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Partículas cósmicas/holográficas
    this.drawParticles(ctx, primaryColor);

    // 2. Anéis HUD de telemetria e graus angulares
    this.drawTelemetryRings(ctx, t, primaryColor, secondaryColor, audioIntensity);

    // 3. Ondas de equalizador de voz circulares na borda
    this.drawCircularVoiceEqualizer(ctx, t, primaryColor, audioIntensity);

    ctx.restore();
  }

  drawParticles(ctx, color) {
    ctx.fillStyle = color;
    for (let p of this.particles) {
      p.y -= p.speed;
      if (p.y < -220) p.y = 220;
      ctx.globalAlpha = p.opacity * 0.45;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  drawTelemetryRings(ctx, t, primaryColor, secondaryColor, audioIntensity) {
    ctx.save();

    const baseRadius = 180;
    const rot = t * 0.0006;

    // Arco de status com rotação lenta
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5 + audioIntensity * 0.4;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 10;

    // Quatro segmentos com miras
    for (let i = 0; i < 4; i++) {
      const angle = rot + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, angle, angle + 0.45);
      ctx.stroke();
    }

    // Traços de grau estilo bússola/radar
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      const len = (a % (Math.PI / 4) === 0) ? 9 : 4;
      const x1 = Math.cos(a) * (baseRadius - 2);
      const y1 = Math.sin(a) * (baseRadius - 2);
      const x2 = Math.cos(a) * (baseRadius + len);
      const y2 = Math.sin(a) * (baseRadius + len);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Indicador numérico holográfico
    ctx.font = '9px "Orbitron", sans-serif';
    ctx.fillStyle = primaryColor;
    ctx.globalAlpha = 0.75;
    ctx.fillText('TARGET: MARY // PROTOCOL ACTIVE', -90, baseRadius + 22);

    ctx.restore();
  }

  drawCircularVoiceEqualizer(ctx, t, primaryColor, audioIntensity) {
    if (this.state !== 'SPEAKING' && audioIntensity <= 0.1) return;

    ctx.save();
    const r = 182;
    const bars = 48;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 12;

    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      const wave = Math.sin(t * 0.02 + i * 0.8) * 0.5 + 0.5;
      const height = wave * (audioIntensity * 28 + 4);

      const x1 = Math.cos(angle) * r;
      const y1 = Math.sin(angle) * r;
      const x2 = Math.cos(angle) * (r + height);
      const y2 = Math.sin(angle) * (r + height);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
