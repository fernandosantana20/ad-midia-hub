// ============================================================================
// AD MÍDIA HUB — VERCEL SERVERLESS CLOUD SYNC (/api/state)
// 100% Vercel & GitHub — Persistência Permanente com Vercel Blob (Private)
// Suporta nativamente:
//   1) Vercel Blob Private Store (@vercel/blob + BLOB_READ_WRITE_TOKEN)
//   2) Upstash Redis / Vercel Marketplace (UPSTASH_REDIS_REST_URL + TOKEN)
//   3) GitHub Cloud Storage (GITHUB_TOKEN + GITHUB_REPO)
//   4) Fallback em memória /tmp da Vercel
// ============================================================================

import { promises as fs } from 'node:fs';
import { put, get } from '@vercel/blob';

const REDIS_KEY = 'ad_midia_hub_cloud_state_v1';
const BLOB_PATHNAME = 'ad-midia-hub-state.json';
const TMP_STATE_PATH = '/tmp/ad-midia-hub-state.json';

let warmMemoryState = null;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'https://ad-midia-hub.vercel.app') return true;
  if (/^https:\/\/ad-midia-hub[a-z0-9-]*\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

// ----------------------------------------------------------------------------
// 1. VERCEL BLOB STORAGE (PRIVATE STORE OFICIAL)
// ----------------------------------------------------------------------------
async function readFromVercelBlob() {
  try {
    const result = await get(BLOB_PATHNAME, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    const text = await new Response(result.stream).text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    // 404 na primeira execução antes do primeiro POST
    if (err && (err.status === 404 || String(err.message || '').toLowerCase().includes('not found'))) {
      return null;
    }
    console.error('Erro ao ler Vercel Blob:', err);
    return null;
  }
}

async function writeToVercelBlob(dataObj) {
  await put(BLOB_PATHNAME, JSON.stringify(dataObj), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0
  });
  return true;
}

// ----------------------------------------------------------------------------
// 2. UPSTASH REDIS (VERCEL MARKETPLACE / KV)
// ----------------------------------------------------------------------------
function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) return { url: url.replace(/\/+$/, ''), token };
  return null;
}

async function readFromRedis(cfg) {
  const resp = await fetch(`${cfg.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: 'no-store'
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  if (!json || !json.result) return null;
  return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
}

async function writeToRedis(cfg, dataObj) {
  const resp = await fetch(`${cfg.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(JSON.stringify(dataObj))
  });
  return resp.ok;
}

// ----------------------------------------------------------------------------
// 3. GITHUB REPOSITORY CLOUD STORAGE
// ----------------------------------------------------------------------------
function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const repo = process.env.GITHUB_REPO || 'fernandosantana20/ad-midia-hub';
  const branch = process.env.GITHUB_DATA_BRANCH || 'cloud-data';
  const path = process.env.GITHUB_DATA_PATH || 'state.json';
  return { token, repo, branch, path };
}

async function readFromGitHub(cfg) {
  const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}?ref=${encodeURIComponent(cfg.branch)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ADMidiaHub-Vercel/2.0'
    },
    cache: 'no-store'
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  if (!json || !json.content) return null;
  const decoded = Buffer.from(json.content, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

async function writeToGitHub(cfg, dataObj) {
  const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`;
  let existingSha = null;

  try {
    const getResp = await fetch(`${url}?ref=${encodeURIComponent(cfg.branch)}`, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ADMidiaHub-Vercel/2.0'
      },
      cache: 'no-store'
    });
    if (getResp.ok) {
      const getJson = await getResp.json();
      existingSha = getJson?.sha || null;
    }
  } catch (_) {}

  const payload = {
    message: `sync: atualizacao automatica nuvem ${new Date().toISOString()}`,
    content: Buffer.from(JSON.stringify(dataObj, null, 2), 'utf8').toString('base64'),
    branch: cfg.branch
  };
  if (existingSha) payload.sha = existingSha;

  const putResp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'ADMidiaHub-Vercel/2.0'
    },
    body: JSON.stringify(payload)
  });
  return putResp.ok;
}

// ----------------------------------------------------------------------------
// 4. FALLBACK TEMPORÁRIO NA VERCEL (/tmp + MEMÓRIA)
// ----------------------------------------------------------------------------
async function readFromTmp() {
  if (warmMemoryState) return warmMemoryState;
  try {
    const raw = await fs.readFile(TMP_STATE_PATH, 'utf8');
    warmMemoryState = JSON.parse(raw);
    return warmMemoryState;
  } catch (_) {
    return null;
  }
}

async function writeToTmp(dataObj) {
  warmMemoryState = dataObj;
  try {
    await fs.writeFile(TMP_STATE_PATH, JSON.stringify(dataObj), 'utf8');
  } catch (_) {}
  return true;
}

// ----------------------------------------------------------------------------
// HANDLER PRINCIPAL (/api/state)
// ----------------------------------------------------------------------------
export default async function handler(req, res) {
  const origin = req.headers?.origin || '';
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://ad-midia-hub.vercel.app');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const redisCfg = getRedisConfig();
  const ghCfg = getGitHubConfig();

  // 1. GET: Ler estado da nuvem (100% Vercel / GitHub)
  if (req.method === 'GET') {
    try {
      if (hasBlobToken) {
        const data = await readFromVercelBlob();
        return res.status(200).json({
          ok: Boolean(data),
          data: data || null,
          storageProvider: 'vercel-blob-private',
          serverTime: new Date().toISOString()
        });
      }

      if (redisCfg) {
        const data = await readFromRedis(redisCfg);
        return res.status(200).json({
          ok: Boolean(data),
          data: data || null,
          storageProvider: 'vercel-upstash-redis',
          serverTime: new Date().toISOString()
        });
      }

      if (ghCfg) {
        const data = await readFromGitHub(ghCfg);
        return res.status(200).json({
          ok: Boolean(data),
          data: data || null,
          storageProvider: 'github-cloud',
          serverTime: new Date().toISOString()
        });
      }

      const tmpData = await readFromTmp();
      return res.status(200).json({
        ok: Boolean(tmpData),
        data: tmpData || null,
        storageProvider: 'vercel-ephemeral',
        serverTime: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erro ao ler estado na nuvem Vercel:', err);
      return res.status(500).json({ ok: false, error: 'Erro ao ler estado da nuvem' });
    }
  }

  // 2. POST: Gravar estado na nuvem (100% Vercel / GitHub)
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_) {
          return res.status(400).json({ ok: false, error: 'JSON inválido' });
        }
      }

      if (!body || !Array.isArray(body.members) || !Array.isArray(body.roles)) {
        return res.status(400).json({ ok: false, error: 'Payload inválido' });
      }

      const payloadToSave = {
        roles: body.roles,
        members: body.members,
        schedules: Array.isArray(body.schedules) ? body.schedules : [],
        systemConfig: body.systemConfig && typeof body.systemConfig === 'object' ? body.systemConfig : undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: typeof body.updatedBy === 'string' ? body.updatedBy.slice(0, 120) : 'system'
      };

      if (hasBlobToken) {
        await writeToVercelBlob(payloadToSave);
        return res.status(200).json({
          ok: true,
          storageProvider: 'vercel-blob-private',
          updatedAt: payloadToSave.updatedAt
        });
      }

      if (redisCfg) {
        const ok = await writeToRedis(redisCfg, payloadToSave);
        if (ok) {
          return res.status(200).json({
            ok: true,
            storageProvider: 'vercel-upstash-redis',
            updatedAt: payloadToSave.updatedAt
          });
        }
      }

      if (ghCfg) {
        const ok = await writeToGitHub(ghCfg, payloadToSave);
        if (ok) {
          return res.status(200).json({
            ok: true,
            storageProvider: 'github-cloud',
            updatedAt: payloadToSave.updatedAt
          });
        }
      }

      await writeToTmp(payloadToSave);
      return res.status(200).json({
        ok: true,
        storageProvider: 'vercel-ephemeral',
        updatedAt: payloadToSave.updatedAt
      });
    } catch (err) {
      console.error('Erro ao gravar estado na nuvem Vercel:', err);
      return res.status(500).json({ ok: false, error: 'Erro ao salvar na nuvem' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}
