import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function Card({ title, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
      {...props}
    >
      {title ? (
        <h2 className="mb-4 text-xl font-semibold text-slate-800">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}
