import { eq } from 'drizzle-orm';
import type { Role } from '@legalcode/shared';
import type { CreateUserInput } from '@legalcode/shared';
import type { AppDb } from '../db/index.js';
import { users } from '../db/schema.js';

export async function findUserByEmail(db: AppDb, email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function findUserById(db: AppDb, id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function listAllUsers(db: AppDb) {
  return db.query.users.findMany({
    orderBy: (u, { desc }) => [desc(u.createdAt)],
  });
}

export async function createUser(db: AppDb, input: CreateUserInput) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newUser = {
    id,
    email: input.email,
    name: input.name,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(users).values(newUser);
  return newUser;
}

export async function updateUserRole(db: AppDb, id: string, role: Role) {
  const now = new Date().toISOString();
  await db.update(users).set({ role, updatedAt: now }).where(eq(users.id, id));
}

export async function deactivateUser(db: AppDb, id: string) {
  await db.delete(users).where(eq(users.id, id));
}
