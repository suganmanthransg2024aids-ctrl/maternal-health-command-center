import React from 'react';
import { useTheme } from '../ThemeContext';
import {
  LayoutDashboard, ShieldCheck, Users, Activity, Baby,
  Phone, CalendarCheck, Bell, BarChart2, FileText,
  LogOut, TrendingUp, ChevronRight, ClipboardList, CheckSquare, X,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'overview',   label: 'Dashboard',           icon: LayoutDashboard },
    ],
  },
  {
    label: 'Daily Work',
    items: [
      { id: 'workflow',   label: 'Daily Workflow',       icon: CheckSquare,    hrtOnly: true },
      { id: 'approvals',  label: 'Approval Queue',       icon: ClipboardList,  execOnly: false, supervisorOnly: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'patients',   label: 'Patient Explorer',    icon: Users },
      { id: 'risk',       label: 'Risk Intelligence',   icon: Activity },
      { id: 'delivery',   label: 'Delivery Monitoring', icon: Baby },
      { id: 'calls',      label: 'Call Tracking',       icon: Phone },
      { id: 'followups',  label: 'Follow-Up Tracking',  icon: CalendarCheck },
      { id: 'alerts',     label: 'Alerts Center',       icon: Bell },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'phc',        label: 'PHC Analytics',       icon: BarChart2 },
      { id: 'validation', label: 'Data Validation',     icon: ShieldCheck },
      { id: 'reports',    label: 'Reports & Exports',   icon: FileText },
    ],
  },
];

const EXEC_SECTION = {
  label: 'Executive',
  items: [
    { id: 'executive', label: 'Executive Analytics', icon: TrendingUp, execOnly: true },
  ],
};

const ROLE_COLOR_DARK = {
  DMCHO: '#3B9FFF', CHO: '#34D399',
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

const ROLE_BG = {
  DMCHO: 'rgba(59,159,255,0.15)', CHO: 'rgba(52,211,153,0.15)',
  HRT1: 'rgba(244,114,182,0.15)', HRT2: 'rgba(167,139,250,0.15)', HRT3: 'rgba(96,165,250,0.15)',
  HRT4: 'rgba(251,191,36,0.15)',  HRT5: 'rgba(52,211,153,0.15)',  HRT6: 'rgba(248,113,113,0.15)',
  HRT7: 'rgba(192,132,252,0.15)', HRT8: 'rgba(251,146,60,0.15)',
};

export default function Sidebar({ activePage, setActivePage, user, onLogout, stats, mobileOpen, onMobileClose }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';

  const roleColor       = ROLE_COLOR_DARK[user?.role] || '#3B9FFF';
  const roleBg          = ROLE_BG[user?.role] || 'rgba(59,159,255,0.15)';
  const isExec          = user?.full_access === true;
  const sections        = isExec ? [EXEC_SECTION, ...NAV_SECTIONS] : NAV_SECTIONS;
  const activeNavAccent = dark ? '#3B9FFF' : '#2563EB';

  return (
    <>
    {/* Mobile backdrop — only when drawer is open, never on desktop */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-40 lg:hidden"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onMobileClose}
      />
    )}
    <aside
      className={`flex flex-col select-none print:hidden flex-shrink-0
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:transition-none`}
      style={{
        width: 228,
        background: 'var(--ccmc-panel)',
        borderRight: dark ? '1px solid var(--ccmc-border)' : '1px solid #E2E8F0',
        boxShadow: dark ? 'none' : '2px 0 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 relative"
        style={{ borderBottom: dark ? '1px solid var(--ccmc-border)' : '1px solid #F1F5F9' }}>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg lg:hidden"
          style={{ color: 'var(--ccmc-text-hint)' }}
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo + app name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
            style={{
              border: dark ? '1.5px solid rgba(59,159,255,0.35)' : '1.5px solid rgba(15,118,110,0.25)',
              boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(15,118,110,0.12)',
            }}>
            <img
              src="/images/mother-baby.png"
              alt="Maternal Health"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.style.background = dark
                  ? 'linear-gradient(135deg, #0F4C81, #1B6BD4)'
                  : 'linear-gradient(135deg, #0F766E, #14B8A6)';
                e.target.parentElement.style.display = 'flex';
                e.target.parentElement.style.alignItems = 'center';
                e.target.parentElement.style.justifyContent = 'center';
                e.target.parentElement.innerHTML = '<svg viewBox="0 0 24 24" fill="none" style="width:20px;height:20px;stroke:white;stroke-width:1.8"><path d="M12 21C12 21 4 16 4 9.5C4 7 6 5 8.5 5C10 5 11.5 5.8 12 7C12.5 5.8 14 5 15.5 5C18 5 20 7 20 9.5C20 16 12 21 12 21Z" stroke-linejoin="round"/></svg>';
              }}
            />
          </div>
          <div>
            <div className="text-[13px] font-bold leading-tight"
              style={{ color: 'var(--ccmc-text)' }}>
              CCMC Health
            </div>
            <div className="text-[10px] font-semibold mt-0.5"
              style={{ color: dark ? 'var(--ccmc-text-hint)' : '#0F766E' }}>
              {dark ? 'Maternal Tracker' : 'Maternal Intelligence'}
            </div>
          </div>
        </div>

        {/* User profile chip */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{
            background: dark ? roleBg : 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
            border: dark ? `1px solid ${roleColor}25` : 'none',
            boxShadow: dark ? 'none' : '0 3px 14px rgba(15,118,110,0.28)',
          }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{
              background: dark
                ? `linear-gradient(135deg, ${roleColor}CC, ${roleColor})`
                : 'rgba(255,255,255,0.2)',
              color: '#FFFFFF',
            }}>
            {user?.role?.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold truncate leading-tight"
              style={{ color: dark ? 'var(--ccmc-text)' : '#FFFFFF' }}>
              {user?.name}
            </div>
            <div className="text-[10px] font-bold mt-0.5"
              style={{ color: dark ? roleColor : 'rgba(255,255,255,0.8)' }}>
              {user?.role}
            </div>
          </div>
          <div className="live-dot flex-shrink-0"
            style={{ background: dark ? '#22C55E' : 'rgba(255,255,255,0.65)' }} />
        </div>
      </div>

      {/* ── Quick stats strip ──────────────────────────────────────────── */}
      {stats && (
        <div className="px-4 py-3 grid grid-cols-2 gap-2"
          style={{ borderBottom: dark ? '1px solid var(--ccmc-border)' : '1px solid #F1F5F9' }}>
          <div className="rounded-lg px-3 py-2 text-center"
            style={{
              background: dark ? 'rgba(59,159,255,0.07)' : '#EFF6FF',
              border: dark ? '1px solid rgba(59,159,255,0.12)' : '1px solid #BFDBFE',
            }}>
            <div className="text-[15px] font-bold leading-none"
              style={{ color: dark ? 'var(--ccmc-text)' : '#1D4ED8' }}>
              {stats.total_mothers?.toLocaleString() || '—'}
            </div>
            <div className="text-[9px] font-semibold mt-1 uppercase tracking-wider"
              style={{ color: dark ? 'var(--ccmc-text-hint)' : '#3B82F6' }}>
              Mothers
            </div>
          </div>
          <div className="rounded-lg px-3 py-2 text-center"
            style={{
              background: dark ? 'rgba(239,68,68,0.07)' : '#FEF2F2',
              border: dark ? '1px solid rgba(239,68,68,0.14)' : '1px solid #FECACA',
            }}>
            <div className="text-[15px] font-bold leading-none"
              style={{ color: dark ? '#F97316' : '#EA580C' }}>
              {stats.due_7_days?.toLocaleString() || '—'}
            </div>
            <div className="text-[9px] font-semibold mt-1 uppercase tracking-wider"
              style={{ color: dark ? 'var(--ccmc-text-hint)' : '#EA580C' }}>
              Due ≤7 Days
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {sections.map((section) => {
          const visibleItems = section.items.filter(({ hrtOnly, supervisorOnly, execOnly }) => {
            const role = user?.role || '';
            const isHRT = role.startsWith('HRT');
            const isSupervisor = role === 'CHO' || role === 'DMCHO';
            const isExecRole = user?.full_access === true;
            if (hrtOnly && !isHRT) return false;
            if (supervisorOnly && !isSupervisor && !isExecRole) return false;
            if (execOnly && !isExecRole) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            <div className="space-y-0.5">
              {visibleItems.map(({ id, label, icon: Icon, execOnly, hrtOnly, supervisorOnly }) => {
                const isActive = activePage === id || (id === 'patients' && activePage === 'patient-profile');
                const itemAccent = execOnly
                  ? (dark ? '#34D399' : '#059669')
                  : hrtOnly ? '#F472B6'
                  : supervisorOnly ? '#F97316'
                  : activeNavAccent;
                return (
                  <button
                    key={id}
                    onClick={() => setActivePage(id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={isActive ? { '--nav-accent': itemAccent } : {}}
                  >
                    <Icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: isActive ? itemAccent : 'inherit' }}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    {execOnly && (
                      <span className="chip flex-shrink-0"
                        style={{
                          background: dark ? 'rgba(52,211,153,0.12)' : '#DCFCE7',
                          color: dark ? '#34D399' : '#15803D',
                          border: dark ? '1px solid rgba(52,211,153,0.2)' : '1px solid #BBF7D0',
                          fontSize: '9px', padding: '2px 6px',
                        }}>
                        EXEC
                      </span>
                    )}
                    {isActive && !execOnly && (
                      <ChevronRight className="w-3 h-3 flex-shrink-0"
                        style={{ color: itemAccent, opacity: 0.6 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="p-3"
        style={{ borderTop: dark ? '1px solid var(--ccmc-border)' : '1px solid #F1F5F9' }}>
        <button
          onClick={onLogout}
          className="nav-item w-full"
          style={{ color: dark ? '#EF4444' : '#DC2626' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.08)' : '#FEF2F2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" style={{ color: 'inherit' }} />
          <span>Sign Out</span>
        </button>
        <div className="text-center text-[9px] mt-2 font-medium"
          style={{ color: 'var(--ccmc-text-hint)', opacity: dark ? 0.5 : 0.8 }}>
          {dark ? 'CCMC · Maternal Health · 2026' : 'Coimbatore City Municipal Corp · 2026'}
        </div>
      </div>
    </aside>
    </>
  );
}
