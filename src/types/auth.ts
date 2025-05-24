import { UserRole } from '../models/User';

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterFounderData extends RegisterUserData {
  companyName: string;
  industry?: string;
}

export interface RegisterAdminData extends RegisterUserData {
  bio?: string;
}

export interface UserProfile {
  companyName?: string;
  industry?: string;
  bio?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    verified: boolean;
    profile?: UserProfile;
  };
}

export interface TokenResponse {
  success: boolean;
  accessToken: string;
}

export interface AuthResponseWithRefresh extends AuthResponse {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}