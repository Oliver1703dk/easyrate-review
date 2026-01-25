import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, AuthBusiness, AuthResponse, LoginInput, RegisterInput } from '@easyrate/shared';

interface AuthContextValue {
  user: AuthUser | null;
  business: AuthBusiness | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'easyrate_token';
const USER_KEY = 'easyrate_user';
const BUSINESS_KEY = 'easyrate_business';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<AuthBusiness | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    const storedBusiness = localStorage.getItem(BUSINESS_KEY);

    if (storedToken && storedUser && storedBusiness) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setBusiness(JSON.parse(storedBusiness));
      } catch {
        // Clear invalid data
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(BUSINESS_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuthState = useCallback((response: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    localStorage.setItem(BUSINESS_KEY, JSON.stringify(response.business));
    setToken(response.token);
    setUser(response.user);
    setBusiness(response.business);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      saveAuthState(data);
    },
    [saveAuthState]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      saveAuthState(data);
    },
    [saveAuthState]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(BUSINESS_KEY);
    setToken(null);
    setUser(null);
    setBusiness(null);
  }, []);

  const value: AuthContextValue = {
    user,
    business,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
