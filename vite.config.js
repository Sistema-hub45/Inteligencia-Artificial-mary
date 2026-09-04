import { defineConfig } from 'vite';
import { exec } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

function maryBridgePlugin() {
  return {
    name: 'mary-bridge-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        // Status da Ponte
        if (url.pathname === '/api/bridge/status' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'online',
            bridgeVersion: '1.0.0',
            os: `${os.type()} ${os.release()} (${os.arch()})`,
            hostname: os.hostname(),
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // Telemetria Real do Computador
        if (url.pathname === '/api/bridge/telemetry' && req.method === 'GET') {
          const totalMem = os.totalmem();
          const freeMem = os.freemem();
          const usedMem = totalMem - freeMem;
          const memPercentage = ((usedMem / totalMem) * 100).toFixed(1);

          const uptimeSec = os.uptime();
          const uptimeHours = Math.floor(uptimeSec / 3600);
          const uptimeMins = Math.floor((uptimeSec % 3600) / 60);

          const cpus = os.cpus();
          const cpuModel = cpus[0]?.model || 'Processador do Sistema';

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            hostname: os.hostname(),
            platform: os.platform(),
            cpu: {
              model: cpuModel,
              cores: cpus.length,
              speed: cpus[0]?.speed
            },
            memory: {
              totalGB: (totalMem / (1024 ** 3)).toFixed(2),
              usedGB: (usedMem / (1024 ** 3)).toFixed(2),
              freeGB: (freeMem / (1024 ** 3)).toFixed(2),
              percentage: memPercentage
            },
            uptime: `${uptimeHours}h ${uptimeMins}m`,
            timestamp: new Date().toLocaleTimeString()
          }));
          return;
        }

        // Execução de Automação no Windows
        if (url.pathname === '/api/bridge/execute' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { action, target, params } = JSON.parse(body || '{}');

              let shellCommand = '';

              switch (action) {
                case 'OPEN_URL': {
                  // Abre URL no navegador padrão do Windows
                  const safeUrl = target.startsWith('http') ? target : `https://${target}`;
                  shellCommand = `start "" "${safeUrl}"`;
                  break;
                }

                case 'OPEN_SETTINGS': {
                  // Abre telas de configurações do Windows
                  let settingsUri = target || 'ms-settings:';
                  if (!settingsUri.startsWith('ms-settings:')) {
                    settingsUri = `ms-settings:${settingsUri}`;
                  }
                  shellCommand = `start ${settingsUri}`;
                  break;
                }

                case 'OPEN_PROJECT': {
                  // Abre projeto no VS Code ou Explorer
                  const projectPath = target || process.cwd();
                  shellCommand = `code "${projectPath}" || start explorer.exe "${projectPath}"`;
                  break;
                }

                case 'OPEN_APP': {
                  // Abre aplicativos comuns
                  const appsMap = {
                    calc: 'start calc',
                    calculadora: 'start calc',
                    notepad: 'start notepad',
                    bloco_de_notas: 'start notepad',
                    terminal: 'start wt || start powershell',
                    cmd: 'start cmd',
                    explorer: 'start explorer',
                    spotify: 'start spotify:'
                  };
                  shellCommand = appsMap[target.toLowerCase()] || `start ${target}`;
                  break;
                }

                case 'RUN_COMMAND': {
                  // Comandos diretos de consulta
                  shellCommand = target;
                  break;
                }

                default: {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: `Ação não suportada: ${action}` }));
                  return;
                }
              }

              console.log(`[MARY BRIDGE] Executando comando: ${shellCommand}`);

              exec(shellCommand, { shell: 'powershell.exe' }, (err, stdout, stderr) => {
                if (err) {
                  console.error(`[MARY BRIDGE] Erro na execução:`, err);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: err.message }));
                  return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  action,
                  target,
                  output: stdout || 'Comando executado com sucesso.',
                  timestamp: new Date().toLocaleTimeString()
                }));
              });

            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `JSON inválido: ${err.message}` }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  plugins: [maryBridgePlugin()]
});
