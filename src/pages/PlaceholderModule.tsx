interface PlaceholderModuleProps {
  title: string;
}

export function PlaceholderModule({ title }: PlaceholderModuleProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-slate-500">This module is coming soon.</p>
    </div>
  );
}
