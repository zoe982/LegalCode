import type { Role } from './index.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt?: string;
}

export interface LoginResponse {
  user: AuthUser;
}
