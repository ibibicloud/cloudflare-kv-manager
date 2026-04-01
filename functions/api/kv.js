export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const accountId = url.searchParams.get("accountId");
  const apiToken = url.searchParams.get("apiToken");
  const namespaceId = url.searchParams.get("namespaceId");
  const key = url.searchParams.get("key");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!accountId || !apiToken || !namespaceId) {
    return Response.json(
      { success: false, error: "缺少参数" },
      { headers: corsHeaders }
    );
  }

  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  const headers = { Authorization: `Bearer ${apiToken}` };

  try {
    // 列出key
    if (request.method === "GET" && !key) {
      const res = await fetch(`${base}/keys?limit=20`, { headers });
      const data = await res.json();
      return Response.json(data, { headers: corsHeaders });
    }

    // 读取value
    if (request.method === "GET" && key) {
      const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, { headers });
      const value = res.ok ? await res.text() : null;
      return Response.json({ value }, { headers: corsHeaders });
    }

    // 保存
    if (request.method === "POST") {
      const { key, value } = await request.json();
      if (!key || value === undefined) {
        return Response.json({ success: false }, { headers: corsHeaders });
      }
      await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers,
        body: value,
      });
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // 删除
    if (request.method === "DELETE") {
      await fetch(`${base}/values/${encodeURIComponent(key)}`, { method: "DELETE", headers });
      return Response.json({ success: true }, { headers: corsHeaders });
    }
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { headers: corsHeaders, status: 500 });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
}