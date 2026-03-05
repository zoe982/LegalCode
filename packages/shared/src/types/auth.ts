import type { Role } from './index.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  user: AuthUser;
}
