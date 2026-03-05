import type { Role } from '@legalcode/shared';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
}

export class UserService {
  constructor(private readonly db: D1Database) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  }

  async findById(id: string): Promise<UserRow | null> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  }

  async listAll(): Promise<UserRow[]> {
    const result = await this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all<UserRow>();
    return result.results;
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        'INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(id, input.email, input.name, input.role, now, now)
      .run();
    return {
      id,
      email: input.email,
      name: input.name,
      role: input.role,
      created_at: now,
      updated_at: now,
    };
  }

  async updateRole(id: string, role: Role): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, now, id)
      .run();
  }

  async deactivate(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  }
}
