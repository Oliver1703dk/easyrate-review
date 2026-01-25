import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(DASHBOARD_TEXT.auth.passwordMismatch);
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, password, name, businessName });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : DASHBOARD_TEXT.auth.registerError);
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
          <CardTitle className="text-2xl">{DASHBOARD_TEXT.auth.registerTitle}</CardTitle>
          <CardDescription>{DASHBOARD_TEXT.auth.registerSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="businessName">{DASHBOARD_TEXT.auth.businessName}</Label>
              <Input
                id="businessName"
                type="text"
                placeholder="Din Virksomhed ApS"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{DASHBOARD_TEXT.auth.name}</Label>
              <Input
                id="name"
                type="text"
                placeholder="Dit navn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              <Label htmlFor="password">{DASHBOARD_TEXT.auth.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{DASHBOARD_TEXT.auth.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? DASHBOARD_TEXT.auth.registering : DASHBOARD_TEXT.auth.register}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{DASHBOARD_TEXT.auth.hasAccount} </span>
            <Link to="/login" className="text-primary hover:underline">
              {DASHBOARD_TEXT.auth.login}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
