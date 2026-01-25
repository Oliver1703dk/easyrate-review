export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  businessId: string;
}

export interface AuthBusiness {
  id: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  business: AuthBusiness;
  token: string;
}
