import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#305dff] text-white hover:bg-[#294fe0] focus:ring-[#305dff] disabled:bg-[#98adff]',
  secondary:
    'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500 disabled:bg-slate-400',
  outline:
    'border-2 border-[#305dff] text-[#305dff] hover:bg-[#eff3ff] focus:ring-[#305dff] disabled:border-[#b8c7ff] disabled:text-[#b8c7ff]',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600 disabled:bg-emerald-300',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 disabled:bg-rose-300',
};

export function Button({
  variant = 'primary',
  fullWidth,
  loading,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`
        inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="size-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
