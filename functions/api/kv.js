export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

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

  if (!accountId || !apiToken || !namespaceId) {
    return new Response(JSON.stringify({
      success: false,
      error: '缺少 accountId / apiToken / namespaceId'
    }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  const headers = { Authorization: `Bearer ${apiToken}` };

  try {
    // 获取 key 列表（限制20条）
    if (request.method === 'GET' && !key) {
      const res = await fetch(`${base}/keys?limit=20`, { headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 获取单个 value
    if (request.method === 'GET' && key) {
      const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, { headers });
      const value = res.ok ? await res.text() : null;
      return new Response(JSON.stringify({ value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 保存 / 更新
    if (request.method === 'POST') {
      const body = await request.json();
      const { key, value } = body;

      if (!key || value === undefined) {
        return new Response(JSON.stringify({ success: false, error: 'key/value 不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'PUT', headers, body: value
      });

      return new Response(JSON.stringify({ success: res.ok }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 删除
    if (request.method === 'DELETE') {
      await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'DELETE', headers
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}