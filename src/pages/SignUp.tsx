import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useSignUpMutation } from '../api/auth';

export function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const signUpMutation = useSignUpMutation();

  const errorMessage = signUpMutation.error?.message ?? fieldError;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setFieldError('Full name, email and password are required');
      return;
    }
    if (password.length < 6) {
      setFieldError('Password must be at least 6 characters');
      return;
    }
    signUpMutation.mutate(
      { fullName: fullName.trim(), email: email.trim(), password },
      {
        onSuccess: () => navigate('/dashboard', { replace: true }),
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <Card title="Create account" className="mb-4">
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
              label="Full name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              disabled={signUpMutation.isPending}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={signUpMutation.isPending}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={signUpMutation.isPending}
              showPasswordToggle
            />
            <Button
              type="submit"
              fullWidth
              loading={signUpMutation.isPending}
              className="mt-2"
            >
              Create account
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
