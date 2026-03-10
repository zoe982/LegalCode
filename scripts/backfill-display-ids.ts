/**
 * Backfill script for display IDs on existing templates.
 *
 * Usage (via wrangler):
 *   npx wrangler d1 execute legalcode-db --command "SELECT id FROM templates ORDER BY created_at ASC"
 *
 * Then run this script to generate UPDATE statements:
 *   npx tsx scripts/backfill-display-ids.ts
 *
 * Or manually run the generated SQL via wrangler d1 execute.
 */

function sequenceToDisplayId(seq: number): string {
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

// Generate SQL for backfilling. Paste template IDs from the SELECT query above.
// Order by created_at ASC to assign IDs in chronological order.
const templateIds: string[] = [
  // Paste template IDs here, e.g.:
  // 'abc-123',
  // 'def-456',
];

if (templateIds.length === 0) {
  console.log('No template IDs provided. Query existing templates first:');
  console.log(
    '  npx wrangler d1 execute legalcode-db --command "SELECT id FROM templates ORDER BY created_at ASC"',
  );
  console.log('Then paste the IDs into this script and re-run.');
} else {
  console.log('-- Backfill display_id for existing templates');
  for (let i = 0; i < templateIds.length; i++) {
    const displayId = sequenceToDisplayId(i + 1);
    const id = templateIds[i];
    console.log(`UPDATE templates SET display_id = '${displayId}' WHERE id = '${String(id)}';`);
  }
}
