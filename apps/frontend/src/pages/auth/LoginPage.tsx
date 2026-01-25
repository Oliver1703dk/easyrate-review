import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  if (authLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : DASHBOARD_TEXT.auth.loginError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
              E
            </div>
          </div>
          <CardTitle className="text-2xl">{DASHBOARD_TEXT.auth.welcomeTitle}</CardTitle>
          <CardDescription>{DASHBOARD_TEXT.auth.welcomeSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{DASHBOARD_TEXT.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="navn@example.dk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{DASHBOARD_TEXT.auth.password}</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                  tabIndex={-1}
                >
                  {DASHBOARD_TEXT.auth.forgotPassword}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? DASHBOARD_TEXT.auth.loggingIn : DASHBOARD_TEXT.auth.login}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{DASHBOARD_TEXT.auth.noAccount} </span>
            <Link to="/register" className="text-primary hover:underline">
              {DASHBOARD_TEXT.auth.createAccount}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
