export async function extractApiError(response: Response, fallback: string): Promise<never> {
  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    // body unreadable
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // not JSON
  }

  if (typeof parsed === 'object' && parsed !== null && 'error' in parsed) {
    const record = parsed as Record<string, unknown>;
    const error = typeof record.error === 'string' ? record.error : '';
    if (error) {
      const detailSuffix = record.details ? ` (${JSON.stringify(record.details)})` : '';
      throw new Error(`${error}${detailSuffix}`);
    }
  }

  const preview = rawText.length > 200 ? rawText.slice(0, 200) + '...' : rawText;
  throw new Error(`${fallback} (HTTP ${String(response.status)}${preview ? `: ${preview}` : ''})`);
}
