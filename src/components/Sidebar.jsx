import React from 'react';
import {
  LayoutDashboard, ShieldCheck, Users, Activity, Baby,
  Phone, CalendarCheck, Bell, BarChart2, FileText,
  LogOut, Heart, TrendingUp,
} from 'lucide-react';

const NAV_BASE = [
  { id: 'overview',    label: 'Dashboard Overview',   icon: LayoutDashboard },
  { id: 'validation',  label: 'Data Validation',       icon: ShieldCheck },
  { id: 'patients',    label: 'Patient Explorer',      icon: Users },
  { id: 'risk',        label: 'Risk Intelligence',     icon: Activity },
  { id: 'delivery',    label: 'Delivery Monitoring',   icon: Baby },
  { id: 'calls',       label: 'Call Tracking',         icon: Phone },
  { id: 'followups',   label: 'Follow-Up Tracking',    icon: CalendarCheck },
  { id: 'alerts',      label: 'Alerts Center',         icon: Bell },
  { id: 'phc',         label: 'PHC Analytics',         icon: BarChart2 },
  { id: 'reports',     label: 'Reports',               icon: FileText },
];

const NAV_EXEC = [
  { id: 'executive',   label: 'Executive Analytics',  icon: TrendingUp, execOnly: true },
];

const ROLE_COLOR = {
  DMCHO: '#42A5F5', CHO: '#34D399',
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

export default function Sidebar({ activePage, setActivePage, user, onLogout, stats }) {
  const roleColor  = ROLE_COLOR[user?.role] || '#42A5F5';
  const isExec     = user?.full_access === true;
  const NAV        = isExec ? [...NAV_EXEC, ...NAV_BASE] : NAV_BASE;

  return (
    <aside
      className="w-60 flex flex-col select-none print:hidden flex-shrink-0"
      style={{
        background: 'var(--ccmc-panel)',
        borderRight: '1px solid var(--ccmc-border)',
        transition: 'background 0.25s',
      }}
    >
      {/* Brand */}
      <div
        className="px-4 py-4 border-b"
        style={{ borderColor: 'var(--ccmc-border)' }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0F4C81, #1976D2)' }}
          >
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider leading-none" style={{ color: 'var(--ccmc-text)' }}>
              HIGH RISK TRACKER
            </div>
            <div className="text-[9px] font-semibold mt-0.5" style={{ color: '#42A5F5' }}>
              CCMC MATERNAL HEALTH
            </div>
          </div>
        </div>

        {/* User badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(15,76,129,0.2)', border: `1px solid ${roleColor}30` }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: roleColor }}
          >
            {user?.role?.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-white truncate leading-none">
              {user?.name}
            </div>
            <div className="text-[9px] font-bold mt-0.5" style={{ color: roleColor }}>
              {user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div
          className="px-3 py-2 border-b grid grid-cols-2 gap-1.5"
          style={{ borderColor: 'var(--ccmc-border)' }}
        >
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: 'var(--ccmc-text)' }}>{stats.total_mothers?.toLocaleString()}</div>
            <div className="text-[9px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>MOTHERS</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color: '#EF4444' }}>
              {stats.critical?.toLocaleString()}
            </div>
            <div className="text-[9px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>CRITICAL</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon, execOnly }) => {
          const isActive = activePage === id || (id === 'patients' && activePage === 'patient-profile');
          const accentColor = execOnly ? '#34D399' : '#42A5F5';
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-xs font-medium"
              style={{
                background: isActive
                  ? execOnly
                    ? 'linear-gradient(135deg, rgba(20,83,45,0.5), rgba(52,211,153,0.2))'
                    : 'linear-gradient(135deg, rgba(15,76,129,0.5), rgba(25,118,210,0.3))'
                  : 'transparent',
                color: isActive ? '#F1F5F9' : '#64748B',
                borderLeft: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = execOnly
                    ? 'rgba(52,211,153,0.08)' : 'rgba(30,58,95,0.3)';
                  e.currentTarget.style.color = '#CBD5E1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? accentColor : 'currentColor' }} />
              <span className="truncate">{label}</span>
              {execOnly && !isActive && (
                <span className="ml-auto text-[8px] font-bold px-1 rounded"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                  EXEC
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'var(--ccmc-border)' }}
      >
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ color: '#EF4444', background: 'rgba(239,68,68,0.05)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
        <div className="text-center text-[9px] text-slate-700 mt-2 font-medium">
          CCMC · MATERNAL · 2024
        </div>
      </div>
    </aside>
  );
}
