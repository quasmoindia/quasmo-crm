import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useLoginMutation, useRequestOtpMutation, useLoginWithOtpMutation } from '../api/auth';
import { getRetryAfterSec } from '../utils/api';

type LoginMode = 'email' | 'phone';

/** Matches the server's 60s send cooldown, so the button re-enables when a resend would work. */
const RESEND_COOLDOWN_SEC = 60;
const OTP_LENGTH = 6;

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
}

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loginMutation = useLoginMutation();
  const requestOtpMutation = useRequestOtpMutation();
  const loginWithOtpMutation = useLoginWithOtpMutation();

  // Single interval drives the resend countdown; cleared on unmount so it cannot outlive the page.
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [cooldown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const errorMessage =
    loginMutation.error?.message ??
    requestOtpMutation.error?.message ??
    loginWithOtpMutation.error?.message ??
    fieldError;

  function resetOtpFlow() {
    setOtpSent(false);
    setOtp('');
    setFieldError(null);
    setNotice(null);
    setCooldown(0);
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    resetOtpFlow();
  }

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

  function sendOtp() {
    setFieldError(null);
    setNotice(null);
    if (!phone.trim()) {
      setFieldError('Phone number is required');
      return;
    }
    requestOtpMutation.mutate(
      { phone: phone.trim() },
      {
        onSuccess: (data) => {
          setOtpSent(true);
          setOtp('');
          setCooldown(RESEND_COOLDOWN_SEC);
          setNotice(
            data.devMode
              ? 'SMS is not configured on the server — check the server console for the code.'
              : data.message
          );
        },
        onError: (error) => {
          // A 429 tells us exactly how long to wait; reflect it rather than guessing.
          const retryAfter = getRetryAfterSec(error);
          if (retryAfter) setCooldown(retryAfter);
        },
      }
    );
  }

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    sendOtp();
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

  const pending =
    loginMutation.isPending || requestOtpMutation.isPending || loginWithOtpMutation.isPending;
  const canVerify = otp.trim().length === OTP_LENGTH;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <BrandLogo variant="stacked" className="mb-8" />
        <Card title="Sign in">
          <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => switchMode('email')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => switchMode('phone')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phone &amp; OTP
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
          ) : !otpSent ? (
            <>
              <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                We&apos;ll text a 6-digit code to the mobile number on your account.
              </p>
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <Input
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile e.g. 9876543210"
                  disabled={pending}
                />
                <Button type="submit" fullWidth loading={requestOtpMutation.isPending} className="mt-2">
                  Send OTP
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span>
                  Code sent to <span className="font-medium text-slate-800">{maskPhone(phone)}</span>
                </span>
                <button
                  type="button"
                  onClick={resetOtpFlow}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Change
                </button>
              </div>

              {notice ? (
                <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>
              ) : null}

              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                <Input
                  label="OTP"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  placeholder="6-digit code"
                  disabled={pending}
                  maxLength={OTP_LENGTH}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={loginWithOtpMutation.isPending}
                  disabled={!canVerify || pending}
                  className="mt-2"
                >
                  Sign in with OTP
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={cooldown > 0 || pending}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
