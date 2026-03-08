export async function extractApiError(response: Response, fallback: string): Promise<never> {
  let body: { error?: string; details?: unknown } | undefined;
  try {
    body = (await response.json()) as { error?: string; details?: unknown };
  } catch {
    // Response body is not JSON — use fallback
  }
  if (body?.error) {
    const detailSuffix = body.details ? ` (${JSON.stringify(body.details)})` : '';
    throw new Error(`${body.error}${detailSuffix}`);
  }
  throw new Error(fallback);
}
