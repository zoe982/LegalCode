import type { Role } from '@legalcode/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AppEnv {
  Bindings: {
    DB: D1Database;
    AUTH_KV: KVNamespace;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    ALLOWED_EMAILS: string;
    ASSETS: Fetcher;
  };
  Variables: {
    user: AuthUser;
  };
}
