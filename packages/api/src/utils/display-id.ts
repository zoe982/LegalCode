/**
 * Converts a 1-based sequence number to a display ID in format TEM-XXX-NNN.
 *
 * - Letter group cycles through AAA-ZZZ (17,576 groups)
 * - Numeric portion cycles 001-999 within each letter group
 * - Total capacity: 17,576 × 999 = 17,558,424 unique IDs
 */
export function sequenceToDisplayId(seq: number): string {
  if (seq < 1 || !Number.isInteger(seq)) {
    throw new Error(`Invalid sequence number: ${String(seq)}. Must be a positive integer.`);
  }

  const letterGroup = Math.floor((seq - 1) / 999);
  const num = ((seq - 1) % 999) + 1;

  const c0 = Math.floor(letterGroup / 676);
  const c1 = Math.floor(letterGroup / 26) % 26;
  const c2 = letterGroup % 26;

  const letters =
    String.fromCharCode(65 + c0) + String.fromCharCode(65 + c1) + String.fromCharCode(65 + c2);
  const numStr = String(num).padStart(3, '0');

  return `TEM-${letters}-${numStr}`;
}

/**
 * Converts a display ID (TEM-XXX-NNN) back to a 1-based sequence number.
 */
export function displayIdToSequence(displayId: string): number {
  const match = /^TEM-([A-Z]{3})-(\d{3})$/.exec(displayId);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid display ID format: ${displayId}. Expected TEM-XXX-NNN.`);
  }

  const letters = match[1];
  const num = parseInt(match[2], 10);

  if (num < 1) {
    throw new Error(`Invalid numeric portion in display ID: ${displayId}. Must be 001-999.`);
  }

  const c0 = letters.charCodeAt(0) - 65;
  const c1 = letters.charCodeAt(1) - 65;
  const c2 = letters.charCodeAt(2) - 65;

  const letterGroup = c0 * 676 + c1 * 26 + c2;

  return letterGroup * 999 + num;
}
