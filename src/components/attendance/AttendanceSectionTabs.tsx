type SectionTab = {
  id: string;
  label: string;
};

export function AttendanceSectionTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: SectionTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              selected
                ? 'bg-[#0D9488] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
