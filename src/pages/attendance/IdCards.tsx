import { useState } from 'react';
import { 
  FiCheckCircle, 
  FiDownload, 
  FiSearch, 
  FiUser, 
  FiBriefcase, 
  FiPhone, 
  FiCheck,
  FiSettings,
  FiLayers,
} from 'react-icons/fi';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { generateIdCardsPdf, triggerBlobDownload, useEmployeesList } from '../../api/attendance';
import type { Employee } from '../../types/attendance';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}



function IdCardPreview({
  employee,
  companyName,
  selected,
  onToggle,
  onDownload,
  downloading,
}: {
  employee: Employee;
  companyName: string;
  selected: boolean;
  onToggle: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 group mx-auto w-full max-w-[280px]">
      <button
        type="button"
        onClick={onToggle}
        className={`relative flex flex-col w-full overflow-hidden rounded-3xl text-center transition-all duration-500 bg-white shadow-lg ${
          selected
            ? 'ring-4 ring-[#305dff] ring-offset-4 shadow-2xl scale-105'
            : 'ring-1 ring-slate-200 hover:ring-[#305dff]/50 hover:shadow-2xl hover:-translate-y-2'
        }`}
      >
        {/* Background Elements (pointer-events-none so they don't interfere) */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-br from-[#1e3a8a] via-[#305dff] to-[#4f74ff] rounded-b-[2rem] opacity-100 shadow-inner overflow-hidden pointer-events-none">
           <div className="absolute -top-12 -right-12 size-40 rounded-full bg-white/10 blur-2xl" />
           <div className="absolute -left-12 top-12 size-32 rounded-full bg-purple-500/30 blur-2xl" />
           <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-[0.03] mix-blend-overlay" />
        </div>
        
        {/* Top Header */}
        <div className="relative z-10 flex flex-col items-center pt-5 px-4 shrink-0">
           <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-white/30 mb-2">
              <img src="/assets/quasmo-logo.png" alt="Quasmo" className="h-7 w-7 object-contain" />
            </div>
            <p className="text-[10px] font-black text-white tracking-[0.2em] uppercase drop-shadow-sm truncate w-full">{companyName}</p>
        </div>

        {/* Profile Photo */}
        <div className="relative z-10 mt-5 mx-auto w-fit group-hover:scale-110 transition-transform duration-500 shrink-0">
          <div className="absolute inset-0 -m-2 rounded-full bg-white/20 blur-md" />
          <div className="absolute inset-0 -m-1 rounded-full bg-gradient-to-br from-white to-white/50 shadow-sm" />
          {employee.referencePhotoUrl ? (
            <img
              src={employee.referencePhotoUrl}
              alt={employee.fullName}
              className="relative size-24 rounded-full border-[3px] border-white object-cover shadow-xl bg-white"
            />
          ) : (
            <div className="relative flex size-24 flex-col items-center justify-center rounded-full border-[3px] border-white bg-slate-50 text-[#305dff] shadow-xl">
              <FiUser className="size-8 opacity-50 mb-1" />
              <span className="text-sm font-bold tracking-wider">{initials(employee.fullName)}</span>
            </div>
          )}
          {employee.bloodGroup && (
             <div className="absolute bottom-0 right-0 rounded-full border-[2.5px] border-white bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg">
              {employee.bloodGroup}
            </div>
          )}
        </div>

        {/* Identity Info */}
        <div className="relative z-10 mt-4 px-4 flex flex-col items-center shrink-0">
          <h3 className="truncate w-full text-lg font-extrabold text-slate-800 leading-tight">
            {employee.fullName}
          </h3>
          <p className="truncate w-full text-[9px] font-bold text-[#305dff] uppercase tracking-[0.15em] mt-1 opacity-90">
            {employee.designation || 'EMPLOYEE'}
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-bold tracking-wider text-slate-500 ring-1 ring-slate-200/80 shadow-sm">
            <span className="text-[#305dff]">ID</span> {employee.employeeCode}
          </div>
        </div>

        {/* Glassmorphism Details Footer - Use standard flow instead of absolute positioning */}
        <div className="relative z-10 mt-4 w-full px-4 pb-5">
          <div className="flex flex-col gap-2 rounded-xl bg-slate-50/80 backdrop-blur-xl p-3 ring-1 ring-slate-200/60 shadow-sm text-left">
            {employee.department && (
              <div className="flex items-center gap-2.5 text-[10px]">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eff3ff] text-[#305dff]">
                  <FiBriefcase className="size-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Department</p>
                  <p className="truncate text-[10px] font-bold text-slate-700 leading-tight">{employee.department}</p>
                </div>
              </div>
            )}
            
            {employee.emergencyContactPhone && (
              <div className="flex items-center gap-2.5 text-[10px]">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <FiPhone className="size-3" />
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Emergency</p>
                  <p className="truncate text-[10px] font-bold text-slate-700 leading-tight">{employee.emergencyContactPhone}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-2 opacity-80">
             <div className="h-0.5 w-6 rounded-full bg-emerald-500/50" />
             <span className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-600">Active Employee</span>
             <div className="h-0.5 w-6 rounded-full bg-emerald-500/50" />
          </div>
        </div>

        {/* Selected Overlay */}
        {selected && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#305dff]/15 backdrop-blur-[2px] transition-all">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#305dff] text-white shadow-2xl ring-[6px] ring-white/50 animate-in zoom-in duration-200">
              <FiCheck className="size-7 stroke-[3]" />
            </div>
          </div>
        )}
      </button>

      {/* Card Action */}
      <Button
        variant="outline"
        className="w-full py-2.5 text-sm border-slate-200 hover:border-[#305dff] hover:bg-[#eff3ff] hover:text-[#305dff] transition-all rounded-xl shadow-sm group font-bold"
        loading={downloading}
        onClick={onDownload}
      >
        <FiDownload className="size-4 mr-2 group-hover:-translate-y-0.5 transition-transform" /> Download PDF
      </Button>
    </div>
  );
}

export function IdCards() {
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyName, setCompanyName] = useState('Quasmo');
  const [companyAddress, setCompanyAddress] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useEmployeesList({ status: 'active', search: searchQuery || undefined, limit: 100 });
  const employees = data?.data ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => setSelected(new Set(employees.map((e) => e._id)));
  const clearSelection = () => setSelected(new Set());

  const downloadFor = async (employeeIds: string[] | undefined, filenameHint: string, setBusy: (v: boolean) => void) => {
    setBusy(true);
    setError('');
    try {
      const blob = await generateIdCardsPdf({
        employeeIds,
        companyName: companyName.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
      });
      triggerBlobDownload(blob, filenameHint);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate ID cards');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Section with glassmorphism/gradient */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1e3a8a] via-[#305dff] to-[#4f74ff] px-8 py-12 shadow-2xl sm:px-12 mb-8">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-purple-500/20 blur-3xl" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 mb-5 backdrop-blur-md shadow-sm">
            <FiCheckCircle className="size-3.5" /> Professional ID Card Generator
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl drop-shadow-sm">
            Design & Print ID Cards
          </h1>
          <p className="mt-4 text-lg text-blue-100/90 font-medium max-w-2xl leading-relaxed">
            Create stunning, print-ready identification cards for your team. Select employees, customize details, and export as PDF instantly with premium designs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <Card className="border-none shadow-md shadow-slate-200/50 ring-1 ring-slate-100/80 overflow-hidden !p-0">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center gap-2">
              <FiSettings className="size-4 text-[#305dff]" />
              <h3 className="font-bold text-slate-800">Card Settings</h3>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Quasmo Inc."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors placeholder:text-slate-400 placeholder:font-normal focus:border-[#305dff] focus:outline-none focus:ring-4 focus:ring-[#305dff]/10 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Return Address (Footer)
                </label>
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="If found, return to..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-colors placeholder:text-slate-400 placeholder:font-normal focus:border-[#305dff] focus:outline-none focus:ring-4 focus:ring-[#305dff]/10 shadow-sm"
                />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-md shadow-slate-200/50 ring-1 ring-slate-100/80 overflow-hidden !p-0">
             <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiLayers className="size-4 text-[#305dff]" />
                <h3 className="font-bold text-slate-800">Bulk Actions</h3>
              </div>
              <span className="rounded-full bg-[#eff3ff] px-2.5 py-0.5 text-xs font-bold text-[#305dff] ring-1 ring-[#305dff]/20 shadow-inner">
                {selected.size} selected
              </span>
            </div>
            <div className="p-5 space-y-3">
              <Button
                className="w-full justify-center !bg-[#305dff] hover:!bg-[#234bd6] text-white shadow-md shadow-[#305dff]/20 transition-all hover:shadow-lg hover:-translate-y-0.5 py-3 rounded-xl font-bold"
                disabled={selected.size === 0}
                loading={downloadingSelected}
                onClick={() => void downloadFor(Array.from(selected), `id-cards-selected-${selected.size}.pdf`, setDownloadingSelected)}
              >
                <FiDownload className="size-4 mr-2" /> Download Selected
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold transition-all hover:shadow-sm"
                loading={downloadingAll}
                onClick={() => void downloadFor(undefined, 'id-cards-all-active.pdf', setDownloadingAll)}
              >
                Download All Active
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/60 mb-2">
            <div className="relative w-full sm:max-w-md">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearchQuery(search);
                }}
                placeholder="Search by name or employee code…"
                className="w-full rounded-xl border-none bg-slate-50/80 py-2.5 pl-11 pr-4 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#305dff]/10 ring-1 ring-slate-200/50 shadow-inner"
              />
            </div>
            
            <div className="flex items-center gap-1.5 w-full sm:w-auto px-1">
              <button 
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-[#305dff] transition-all" 
                onClick={() => setSearchQuery(search)}
              >
                Search
              </button>
              <div className="h-6 w-px bg-slate-200 mx-1 shrink-0" />
              <button 
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-[#305dff] transition-all shrink-0" 
                onClick={selectAllVisible}
              >
                Select All
              </button>
              <button 
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0" 
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {error && (
            <div className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-600 border border-rose-100 flex items-center gap-3 shadow-sm">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <div className="size-2 rounded-full bg-rose-500 animate-pulse" />
              </div>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-[32rem] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="relative flex size-12 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                <div className="absolute inset-0 rounded-full border-4 border-[#305dff] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm font-bold text-slate-500 tracking-wide">LOADING EMPLOYEES...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex h-[32rem] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="flex size-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <FiUser className="size-8 text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-800">No employees found</p>
                <p className="text-sm font-medium text-slate-500 mt-1">Try adjusting your search query.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {employees.map((emp) => (
                <IdCardPreview
                  key={emp._id}
                  employee={emp}
                  companyName={companyName.trim() || 'Company'}
                  selected={selected.has(emp._id)}
                  onToggle={() => toggle(emp._id)}
                  downloading={downloadingId === emp._id}
                  onDownload={() =>
                    void downloadFor([emp._id], `id-card-${emp.employeeCode}.pdf`, (busy) =>
                      setDownloadingId(busy ? emp._id : null)
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

