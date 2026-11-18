// ============================================================================
// AD MÍDIA HUB — VERCEL SERVERLESS CLOUD SYNC (/api/state)
// Sincronização em nuvem simultânea entre todos os aparelhos e computadores
// ============================================================================

const CLOUD_STORAGE_URL = 'https://ad-midia-hub-escala-desativado.netlify.app/api/state';

export default async function handler(req, res) {
  // Configuração de cabeçalhos CORS e sem cache para sincronização em tempo real
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET: Ler os dados da nuvem
  if (req.method === 'GET') {
    try {
      const resp = await fetch(CLOUD_STORAGE_URL, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ADMidiaHub-VercelProxy/1.0'
        },
        cache: 'no-store'
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json && json.ok && json.data) {
          return res.status(200).json({
            ok: true,
            data: json.data,
            serverTime: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Erro ao ler da nuvem:', err);
    }

    return res.status(200).json({ ok: false, error: 'Falha ao ler dados da nuvem' });
  }

  // 2. POST: Gravar dados na nuvem
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (_) {}
      }

      if (!body || !Array.isArray(body.members) || !Array.isArray(body.roles)) {
        return res.status(400).json({ ok: false, error: 'Payload inválido' });
      }

      const resp = await fetch(CLOUD_STORAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ADMidiaHub-VercelProxy/1.0'
        },
        body: JSON.stringify(body)
      });

      if (resp.ok) {
        const json = await resp.json();
        return res.status(200).json({
          ok: true,
          updatedAt: json.updatedAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao gravar na nuvem:', err);
    }

    return res.status(500).json({ ok: false, error: 'Falha ao salvar na nuvem' });
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}
