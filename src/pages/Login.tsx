import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useLoginMutation, useRequestOtpMutation, useLoginWithOtpMutation } from '../api/auth';

type LoginMode = 'email' | 'phone';

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();
  const requestOtpMutation = useRequestOtpMutation();
  const loginWithOtpMutation = useLoginWithOtpMutation();

  const errorMessage =
    loginMutation.error?.message ??
    requestOtpMutation.error?.message ??
    loginWithOtpMutation.error?.message ??
    fieldError;

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!email.trim() || !password) {
      setFieldError('Email and password are required');
      return;
    }
    loginMutation.mutate(
      { email: email.trim(), password },
      { onSuccess: () => navigate('/dashboard', { replace: true }) }
    );
  }

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!phone.trim()) {
      setFieldError('Phone number is required');
      return;
    }
    requestOtpMutation.mutate(
      { phone: phone.trim() },
      {
        onSuccess: () => setOtpSent(true),
        onError: () => setFieldError(null),
      }
    );
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (!phone.trim() || !otp.trim()) {
      setFieldError('Phone and OTP are required');
      return;
    }
    loginWithOtpMutation.mutate(
      { phone: phone.trim(), otp: otp.trim() },
      { onSuccess: () => navigate('/dashboard', { replace: true }) }
    );
  }

  const pending = loginMutation.isPending || requestOtpMutation.isPending || loginWithOtpMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <Card title="Sign in" className="mb-4">
          <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('email');
                setFieldError(null);
                setOtpSent(false);
                setOtp('');
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('phone');
                setFieldError(null);
                setOtpSent(false);
                setOtp('');
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phone & OTP
            </button>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {mode === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={pending}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                showPasswordToggle
              />
              <Button type="submit" fullWidth loading={pending} className="mt-2">
                Sign in
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <Input
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile e.g. 9876543210"
                  disabled={pending || otpSent}
                />
                {!otpSent ? (
                  <Button
                    type="submit"
                    fullWidth
                    loading={requestOtpMutation.isPending}
                    className="mt-2"
                  >
                    Send OTP
                  </Button>
                ) : null}
              </form>
              {otpSent && (
                <form onSubmit={handleOtpSubmit} className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4">
                  <Input
                    label="OTP"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    disabled={pending}
                    maxLength={6}
                  />
                  <Button type="submit" fullWidth loading={loginWithOtpMutation.isPending} className="mt-2">
                    Sign in with OTP
                  </Button>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Change number
                  </button>
                </form>
              )}
            </>
          )}
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
