type BrandLogoProps = {
  /** icon = mark only; mark = horizontal lockup; stacked = centered for auth screens; full = raster banner (dark bg only) */
  variant?: 'icon' | 'mark' | 'stacked' | 'full';
  className?: string;
  iconClassName?: string;
  /** Use light text on dark backgrounds */
  inverted?: boolean;
};

function LogoIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <img
      src="/assets/hexacrm-icon.png"
      alt=""
      aria-hidden
      className={`shrink-0 rounded-[14px] object-cover shadow-sm ring-1 ring-black/5 ${className}`}
    />
  );
}

function LogoWordmark({ inverted = false, centered = false }: { inverted?: boolean; centered?: boolean }) {
  const titleColor = inverted ? 'text-white' : 'text-slate-800';
  const crmColor = inverted ? 'text-blue-300' : 'text-[#305dff]';
  const subColor = inverted ? 'text-white/65' : 'text-slate-500';

  return (
    <div className={centered ? 'text-center' : 'min-w-0'}>
      <p className={`text-[15px] font-extrabold leading-none tracking-tight ${titleColor}`}>
        HEXA<span className={crmColor}>CRM</span>
      </p>
      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${subColor}`}>
        Powered by QUASMO
      </p>
    </div>
  );
}

export function BrandLogo({
  variant = 'mark',
  className = '',
  iconClassName = 'h-9 w-9',
  inverted = false,
}: BrandLogoProps) {
  if (variant === 'icon') {
    return (
      <img
        src="/assets/hexacrm-icon.png"
        alt="HexaCRM-QUASMO"
        className={`rounded-[14px] object-cover shadow-sm ring-1 ring-black/5 ${iconClassName} ${className}`}
      />
    );
  }

  if (variant === 'full') {
    return (
      <img
        src="/assets/hexacrm-logo.png"
        alt="HexaCRM-QUASMO"
        className={`h-10 w-auto max-w-full object-contain ${className}`}
      />
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <LogoIcon className="h-16 w-16 rounded-[18px]" />
        <LogoWordmark inverted={inverted} centered />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="HexaCRM-QUASMO">
      <LogoIcon className={iconClassName} />
      <LogoWordmark inverted={inverted} />
    </div>
  );
}
