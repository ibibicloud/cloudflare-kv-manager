export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 从URL获取所有参数
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
      return new Response(JSON.stringify({ error: '请填写完整凭据' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
    const headers = { Authorization: `Bearer ${apiToken}` };

    // 1. GET 列出所有key（限制20条）
    if (request.method === 'GET' && !key) {
      const res = await fetch(`${base}/keys?limit=20`, { headers });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. GET 读取单个value
    if (request.method === 'GET' && key) {
      const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, { headers });
      const value = res.ok ? await res.text() : null;
      return new Response(JSON.stringify({ value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. POST 保存/更新
    if (request.method === 'POST') {
      const { key, value } = await request.json();
      if (!key || value === undefined) throw new Error('key/value不能为空');
      
      const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'PUT', headers, body: value
      });
      
      return new Response(JSON.stringify({ success: res.ok }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. DELETE 删除
    if (request.method === 'DELETE') {
      await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: 'DELETE', headers
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('不支持的方法', { status: 405 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}