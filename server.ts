import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { monitorService } from './server/monitor.ts';
import { generateBashAgent, generatePythonAgent, generateInstallScript } from './server/agentGenerator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// API Endpoints

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Get current monitoring status and telemetry
app.get('/api/status', async (_req, res) => {
  try {
    const state = await monitorService.getFreshState();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao carregar status' });
  }
});

// 2. Trigger an immediate check
app.post('/api/check-now', async (_req, res) => {
  try {
    const updatedState = await monitorService.runCheck();
    res.json({
      success: true,
      state: updatedState,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao realizar checagem' });
  }
});

// 2.1 Test any arbitrary IP or Hostname
app.post('/api/test-ip', async (req, res) => {
  try {
    const { ip, port, timeoutMs } = req.body;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ success: false, error: 'Endereço IP ou hostname é obrigatório' });
    }
    const cleanIp = ip.trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const targetPort = port ? parseInt(port, 10) : 22;
    const timeout = timeoutMs ? parseInt(timeoutMs, 10) : 3000;

    const result = await monitorService.testArbitraryIp(cleanIp, targetPort, timeout);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Erro ao testar IP' });
  }
});

// 3. Update monitoring configuration
app.post('/api/config', (req, res) => {
  try {
    const { targetIp, targetPort, checkIntervalSeconds, timeoutMs, failureThreshold } = req.body;
    const newConfig = monitorService.updateConfig({
      targetIp: targetIp ? String(targetIp).trim() : undefined,
      targetPort: targetPort ? parseInt(targetPort, 10) : undefined,
      checkIntervalSeconds: checkIntervalSeconds ? parseInt(checkIntervalSeconds, 10) : undefined,
      timeoutMs: timeoutMs ? parseInt(timeoutMs, 10) : undefined,
      failureThreshold: failureThreshold ? parseInt(failureThreshold, 10) : undefined,
    });
    res.json({ success: true, config: newConfig });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Configuração inválida' });
  }
});

// 4. Agent heartbeat endpoint
app.post('/api/agent/heartbeat', (req, res) => {
  try {
    const { bootTime, uptimeSeconds, hostname, os, kernel, metrics } = req.body;

    if (!bootTime) {
      return res.status(400).json({ success: false, error: 'bootTime é obrigatório' });
    }

    const result = monitorService.handleAgentHeartbeat({
      bootTime: String(bootTime),
      uptimeSeconds: typeof uptimeSeconds === 'number' ? uptimeSeconds : undefined,
      hostname: hostname ? String(hostname) : undefined,
      os: os ? String(os) : undefined,
      kernel: kernel ? String(kernel) : undefined,
      metrics,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Simulate reboot event (for dashboard demo/testing)
app.post('/api/agent/simulate-reboot', (_req, res) => {
  try {
    const event = monitorService.simulateReboot();
    res.json({ success: true, event });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Clear events history
app.post('/api/events/clear', (_req, res) => {
  monitorService.clearEvents();
  res.json({ success: true, message: 'Histórico limpo' });
});

// 7. Dynamic installer script
app.get('/api/agent/install.sh', (req, res) => {
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(generateInstallScript(hostUrl));
});

// 8. Standalone bash agent script
app.get('/api/agent/script.sh', (req, res) => {
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(generateBashAgent(hostUrl));
});

// 9. Standalone Python agent script
app.get('/api/agent/script.py', (req, res) => {
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(generatePythonAgent(hostUrl));
});

// 10. Export events as CSV or JSON
app.get('/api/events/export', (req, res) => {
  const format = req.query.format === 'json' ? 'json' : 'csv';
  const events = monitorService.getState().events;

  if (format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename="historico_eventos_servidor.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(events, null, 2));
  }

  // CSV
  let csv = 'ID,Tipo,Data_Hora,Titulo,Descricao,Duracao_Segundos,IP,Origem\n';
  events.forEach((e) => {
    const durSec = e.durationMs ? Math.round(e.durationMs / 1000) : '';
    const ip = e.metadata?.ip || '';
    const src = e.metadata?.source || '';
    const desc = (e.description || '').replace(/"/g, '""');
    const title = (e.title || '').replace(/"/g, '""');
    csv += `"${e.id}","${e.type}","${e.timestamp}","${title}","${desc}","${durSec}","${ip}","${src}"\n`;
  });

  res.setHeader('Content-Disposition', 'attachment; filename="historico_eventos_servidor.csv"');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(csv);
});

// Full-stack Vite & Static mounting
async function startServer() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));

  if (!isProduction && !hasDist) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware mode warning:', e);
    }
  } else if (hasDist) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.status(404).send('Build files not found. Run npm run build.');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Monitor Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Monitor Server] Target: 89.58.58.246:22 (Check interval: 10s)`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
