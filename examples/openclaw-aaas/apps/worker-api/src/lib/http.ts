export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

export function methodNotAllowed(allow: string): Response {
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    {
      status: 405,
      headers: {
        allow,
        "content-type": "application/json; charset=utf-8"
      }
    }
  );
}

export async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
