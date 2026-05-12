import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function Card({ title, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5 lg:p-6 ${className}`}
      {...props}
    >
      {title ? (
        <h2 className="mb-3 text-lg font-semibold text-slate-900 sm:mb-4 sm:text-xl">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}
