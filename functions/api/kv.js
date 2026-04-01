export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 从 URL 参数获取凭据和 key（GET 请求不再用 body）
  const accountId = url.searchParams.get('accountId');
  const apiToken = url.searchParams.get('apiToken');
  const namespaceId = url.searchParams.get('namespaceId');
  const key = url.searchParams.get('key');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!accountId || !apiToken || !namespaceId) {
      return new Response(JSON.stringify({ error: '缺少凭据' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
    const headers = { Authorization: `Bearer ${apiToken}` };

    // GET：列出所有 key
    if (request.method === 'GET' && !key) {
      const res = await fetch(`${base}/keys`, { headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET：获取单个 key
    if (request.method === 'GET' && key) {
      const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, { headers });
      const value = res.ok ? await res.text() : null;
      return new Response(JSON.stringify({ value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST：保存/更新
    if (request.method === 'POST') {
      const { key, value } = await request.json();
      await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'PUT', headers, body: value
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE：删除
    if (request.method === 'DELETE') {
      await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'DELETE', headers
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}