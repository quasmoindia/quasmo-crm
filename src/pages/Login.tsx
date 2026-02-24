import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useLoginMutation } from '../api/auth';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();

  const errorMessage = loginMutation.error?.message ?? fieldError;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!email.trim() || !password) {
      setFieldError('Email and password are required');
      return;
    }
    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => navigate('/dashboard', { replace: true }),
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <Card title="Sign in" className="mb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMessage ? (
              <div
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loginMutation.isPending}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loginMutation.isPending}
              showPasswordToggle
            />
            <Button
              type="submit"
              fullWidth
              loading={loginMutation.isPending}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
