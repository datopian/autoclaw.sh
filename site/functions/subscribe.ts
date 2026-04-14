interface Env {
  BREVO_API_KEY: string;
  BREVO_LIST_ID: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  let email: string | null = null;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json<{ email?: string }>();
    email = body.email ?? null;
  } else {
    const form = await request.formData();
    email = form.get('email') as string | null;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: corsHeaders });
  }

  const listId = Number(env.BREVO_LIST_ID);
  if (!listId) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: corsHeaders });
  }

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  // 201 = created, 204 = already exists (updateEnabled)
  if (res.status === 201 || res.status === 204) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  const errBody = await res.text();
  console.error('Brevo error', res.status, errBody);
  return new Response(JSON.stringify({ error: 'Subscription failed' }), { status: 502, headers: corsHeaders });
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
