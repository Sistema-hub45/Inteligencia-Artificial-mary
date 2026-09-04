// Cliente de comunicação com a Ponte Local (Mary PC Bridge)

export class LocalBridge {
  constructor() {
    this.isOnline = false;
    this.statusCheckInterval = null;
  }

  async checkStatus() {
    try {
      const response = await fetch('/api/bridge/status');
      if (response.ok) {
        const data = await response.json();
        this.isOnline = (data.status === 'online');
        return data;
      }
      this.isOnline = false;
      return null;
    } catch {
      this.isOnline = false;
      return null;
    }
  }

  async getTelemetry() {
    try {
      const response = await fetch('/api/bridge/telemetry');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  async execute(action, target, params = {}) {
    try {
      const response = await fetch('/api/bridge/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target, params })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[LOCAL BRIDGE] Erro ao comunicar com a ponte local:', error);
      return { success: false, error: error.message };
    }
  }
}

export const localBridge = new LocalBridge();
