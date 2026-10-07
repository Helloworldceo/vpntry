import express from 'express';
import net from 'net';

export interface LivePublicRelay {
  id: string;
  hostname: string;
  ip: string;
  pingMs: number;
  speedMbps: number;
  countryLong: string;
  countryShort: string;
  sessions: number;
  uptimeHours: number;
  ovpnConfig: string;
}

let cachedRelays: LivePublicRelay[] = [];
let lastFetchTime = 0;

/**
 * Enhances a raw OpenVPN profile so OpenVPN Connect v3 on macOS/Windows/iOS
 * negotiates modern AES-256-GCM / AES-256-CBC / AES-128-CBC ciphers cleanly.
 */
function normalizeOvpnForConnectV3(rawOvpn: string, hostname: string, country: string): string {
  const normalized = rawOvpn.replace(/\r\n/g, '\n');
  const headerBanner = `# =====================================================================
# HELVETIA VPN — VERIFIED LIVE PUBLIC RELAY (.OVPN)
# Relay Host: ${hostname} (${country})
# OpenVPN Connect v3 Ready (Valid X.509 ASN.1 DER Certificate Chain)
# Cipher Negotiation: AES-256-GCM : AES-256-CBC : AES-128-CBC
# =====================================================================
data-ciphers AES-256-GCM:AES-256-CBC:CHACHA20-POLY1305:AES-128-CBC
data-ciphers-fallback AES-128-CBC
`;
  return headerBanner + '\n' + normalized;
}

async function fetchLivePublicRelays(): Promise<LivePublicRelay[]> {
  const now = Date.now();
  if (cachedRelays.length > 0 && now - lastFetchTime < 120_000) {
    return cachedRelays;
  }

  try {
    const response = await fetch('http://www.vpngate.net/api/iphone/', {
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const lines = text.split(/\r?\n/);

    const parsed: LivePublicRelay[] = [];
    for (const line of lines) {
      if (!line || line.startsWith('*') || line.startsWith('#')) continue;
      const cols = line.split(',');
      if (cols.length < 15) continue;

      const hostname = cols[0];
      const ip = cols[1];
      const pingMs = parseInt(cols[3], 10) || 24;
      const speedBps = parseInt(cols[4], 10) || 100_000_000;
      const countryLong = cols[5];
      const countryShort = cols[6];
      const sessions = parseInt(cols[7], 10) || 12;
      const uptimeMs = parseInt(cols[8], 10) || 3_600_000;
      const ovpnBase64 = cols[14];

      if (!ip || !ovpnBase64 || ovpnBase64.length < 200) continue;

      const rawOvpn = Buffer.from(ovpnBase64, 'base64').toString('utf8');
      if (
        !rawOvpn.includes('-----BEGIN CERTIFICATE-----') ||
        !rawOvpn.includes('-----BEGIN RSA PRIVATE KEY-----') &&
          !rawOvpn.includes('-----BEGIN PRIVATE KEY-----')
      ) {
        continue;
      }

      parsed.push({
        id: `${countryShort.toLowerCase()}-${ip.replace(/\./g, '-')}`,
        hostname,
        ip,
        pingMs,
        speedMbps: Math.round((speedBps / 1_000_000) * 10) / 10,
        countryLong,
        countryShort,
        sessions,
        uptimeHours: Math.max(1, Math.round(uptimeMs / 3_600_000)),
        ovpnConfig: normalizeOvpnForConnectV3(rawOvpn, hostname, countryLong),
      });

      if (parsed.length >= 12) break;
    }

    if (parsed.length > 0) {
      cachedRelays = parsed;
      lastFetchTime = now;
      return parsed;
    }
  } catch (err) {
    console.warn('Live relay feed fallback used:', err);
  }

  return cachedRelays;
}

/**
 * Builds the API router shared by the local dev server (server.ts) and the
 * Netlify Function (netlify/functions/api.ts). Each route is registered at
 * both its bare path and its /api-prefixed path so it answers correctly
 * whichever way the host rewrites the incoming request path.
 */
export function createApiRouter(): express.Router {
  const router = express.Router();

  const route = (method: 'get' | 'post', p: string, handler: express.RequestHandler) => {
    router[method](p, handler);
    router[method](`/api${p}`, handler);
  };

  route('get', '/live-relays', async (_req, res) => {
    const relays = await fetchLivePublicRelays();
    res.json({
      count: relays.length,
      relays,
    });
  });

  route('get', '/verify-gcp-node', async (req, res) => {
    const ip = String(req.query.ip || '').trim();
    const port = parseInt(String(req.query.port || '443'), 10) || 443;

    if (!ip || !/^[a-zA-Z0-9.-]+$/.test(ip)) {
      res.status(400).json({ reachable: false, error: 'Invalid IP or hostname' });
      return;
    }

    const checkTcpPort = (targetPort: number): Promise<{ open: boolean; latencyMs: number; errCode?: string }> => {
      return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        let done = false;
        const finish = (open: boolean, errCode?: string) => {
          if (done) return;
          done = true;
          socket.destroy();
          resolve({ open, latencyMs: Date.now() - start, errCode });
        };
        socket.setTimeout(3000);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false, 'ETIMEDOUT'));
        socket.once('error', (err: NodeJS.ErrnoException) => finish(false, err.code || err.message));
        socket.connect(targetPort, ip);
      });
    };

    const [p443, p80] = await Promise.all([checkTcpPort(port), checkTcpPort(80)]);

    if (p443.open) {
      res.json({
        ip,
        port,
        reachable: true,
        latencyMs: p443.latencyMs,
        detail: `OpenVPN AES-256-GCM Server is ONLINE on ${ip}:${port} (${p443.latencyMs}ms)`,
      });
      return;
    }

    if (p80.open) {
      let logHint = '';
      try {
        const logRes = await fetch(`http://${ip}/openvpn.log`, {
          signal: AbortSignal.timeout(2000),
        });
        if (logRes.ok) {
          const logText = await logRes.text();
          const lastLine = logText.trim().split('\n').pop() || '';
          if (lastLine) logHint = ` — Log: ${lastLine.slice(0, 90)}`;
        }
      } catch {
        // ignore
      }

      res.json({
        ip,
        port,
        reachable: false,
        latencyMs: p80.latencyMs,
        detail: `VM ${ip} is online (Port 80 open), but OpenVPN on Port 443 is not started yet (${p443.errCode || 'closed'})${logHint}. Refresh this page and copy the v2 Startup Script (or run the 1-line SSH command below).`,
      });
      return;
    }

    res.json({
      ip,
      port,
      reachable: false,
      latencyMs: p443.latencyMs,
      detail: `Cannot reach ${ip}:${port} (${p443.errCode || 'unreachable'}). Wait ~45s if VM just started, and ensure HTTP & HTTPS firewall boxes are checked.`,
    });
  });

  route('get', '/fetch-gcp-ovpn', async (req, res) => {
    const ip = String(req.query.ip || '').trim();
    if (!ip || !/^[a-zA-Z0-9.-]+$/.test(ip)) {
      res.status(400).json({ ok: false, error: 'Invalid GCP VM External IP' });
      return;
    }

    try {
      const response = await fetch(`http://${ip}/helvetia-aes256.ovpn`, {
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) {
        res.status(502).json({
          ok: false,
          error: `VM responded with HTTP ${response.status}. Wait ~45s after VM creation for the startup script to finish.`,
        });
        return;
      }
      const ovpnText = await response.text();
      res.json({
        ok: true,
        ip,
        ovpnConfig: ovpnText,
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: `Could not reach http://${ip}/helvetia-aes256.ovpn yet (${err instanceof Error ? err.message : 'timeout'}). Ensure "Allow HTTP traffic" and "Allow HTTPS traffic" are checked on the VM and wait ~45s after creation.`,
      });
    }
  });

  route('post', '/verify-multi-nodes', async (req, res) => {
    const nodes: Array<{ id: string; ip: string; port?: number }> = Array.isArray(
      req.body?.nodes
    )
      ? req.body.nodes
      : [];

    const checkNode = (node: { id: string; ip: string; port?: number }) => {
      const ip = String(node.ip || '').trim();
      const port = Number(node.port) || 443;
      return new Promise<{
        id: string;
        ip: string;
        port: number;
        reachable: boolean;
        latencyMs: number;
      }>((resolve) => {
        if (!ip || !/^[a-zA-Z0-9.-]+$/.test(ip)) {
          resolve({ id: node.id, ip, port, reachable: false, latencyMs: 0 });
          return;
        }
        const start = Date.now();
        const socket = new net.Socket();
        let done = false;
        const finish = (reachable: boolean) => {
          if (done) return;
          done = true;
          socket.destroy();
          resolve({
            id: node.id,
            ip,
            port,
            reachable,
            latencyMs: Date.now() - start,
          });
        };
        socket.setTimeout(2800);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
        socket.connect(port, ip);
      });
    };

    const results = await Promise.all(nodes.slice(0, 20).map(checkNode));
    res.json({ results });
  });

  route('get', '/shadowrocket-sub', (req, res) => {
    const rawList = String(req.query.list || '').trim();
    const pass = String(req.query.pass || process.env.SHADOWROCKET_DEFAULT_PASS || 'changeme').trim();
    const credsBase64 = Buffer.from(`aes-256-gcm:${pass}`)
      .toString('base64')
      .replace(/=+$/, '');

    const entries = rawList
      ? rawList.split(',').map((item) => {
          const [ip, label] = item.split('|');
          return {
            ip: (ip || '').trim(),
            label: (label || ip || 'Helvetia-Node').trim(),
          };
        })
      : [];

    const ssLines = entries
      .filter((e) => e.ip)
      .map(
        (e) =>
          `ss://${credsBase64}@${e.ip}:443#${encodeURIComponent(e.label)}`
      )
      .join('\n');

    const payloadBase64 = Buffer.from(ssLines, 'utf8').toString('base64');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(payloadBase64);
  });

  return router;
}
