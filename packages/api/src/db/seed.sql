INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  'seed-admin-001',
  'zoe@marsico.org',
  'Zoe Marsico',
  'admin',
  datetime('now'),
  datetime('now')
);
