import React, { useState } from 'react';
import {
  Bell, RefreshCw, CheckCircle, AlertTriangle, Info,
  Sun, Moon, X, Wifi, WifiOff,
} from 'lucide-react';

export default function Header({ user, backendOK, lastSync, syncing, onRefresh, notifications, clearNotifications, stats, theme, toggleTheme }) {
  const [showBell, setShowBell] = useState(false);
  const unread = notifications.length;
  const dark   = theme !== 'bright';

  const typeIcon = (type) => {
    if (type === 'SUCCESS') return <CheckCircle className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />;
    if (type === 'ERROR')   return <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />;
    return <Info className="w-3.5 h-3.5" style={{ color: '#3B9FFF' }} />;
  };

  const liveOkBg    = dark ? 'rgba(34,197,94,0.08)'   : '#DCFCE7';
  const liveOkBd    = dark ? 'rgba(34,197,94,0.2)'    : 'none';
  const liveOkClr   = dark ? '#22C55E'                : '#15803D';
  const liveOffBg   = dark ? 'rgba(245,158,11,0.08)'  : '#FEF9C3';
  const liveOffBd   = dark ? 'rgba(245,158,11,0.2)'   : 'none';
  const liveOffClr  = dark ? '#FBBF24'                : '#92400E';

  const statColors = dark
    ? { total: '#3B9FFF', critical: '#EF4444', due: '#F97316' }
    : { total: '#2563EB', critical: '#DC2626', due: '#EA580C' };

  return (
    <header
      className="flex items-center justify-between px-6 flex-shrink-0 print:hidden"
      style={{
        height: 60,
        background: dark
          ? 'var(--ccmc-panel)'
          : 'linear-gradient(90deg, #FFFFFF 0%, #F0F9FF 50%, #ECFDF5 100%)',
        borderBottom: dark ? '1px solid var(--ccmc-border)' : '1px solid #E2E8F0',
        boxShadow: dark ? 'none' : '0 1px 0 rgba(255,255,255,0.8), 0 2px 16px rgba(0,0,0,0.04)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* ── Left: breadcrumb + status ───────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: backendOK ? liveOkBg : liveOffBg,
            border: `1px solid ${backendOK ? liveOkBd : liveOffBd}`,
          }}>
          {backendOK
            ? <Wifi className="w-3 h-3" style={{ color: liveOkClr }} />
            : <WifiOff className="w-3 h-3" style={{ color: liveOffClr }} />
          }
          <div className="live-dot" style={{
            background: backendOK ? (dark ? '#22C55E' : '#10B981') : (dark ? '#FBBF24' : '#F59E0B'),
            animation: backendOK ? undefined : 'none',
          }} />
          <span className="text-[11px] font-semibold" style={{ color: backendOK ? liveOkClr : liveOffClr }}>
            {backendOK ? 'Live' : 'Offline'}
          </span>
          {lastSync && (
            <span className="text-[10px] hidden md:block" style={{ color: 'var(--ccmc-text-hint)' }}>
              · {lastSync}
            </span>
          )}
        </div>

        {/* Page title */}
        <div>
          <div className="text-[13px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
            {dark ? 'Maternal Health Command Center' : 'CCMC Healthcare Intelligence Center'}
          </div>
          <div className="text-[10px] hidden md:block" style={{ color: 'var(--ccmc-text-hint)' }}>
            {user?.full_access ? (dark ? 'Full Access' : 'Executive Dashboard · Full Access') : `Restricted: ${user?.phcs?.join(', ')}`}
          </div>
        </div>
      </div>

      {/* ── Center: live stats ─────────────────────────────────────── */}
      {stats && (
        <div className="hidden lg:flex items-center gap-1">
          {[
            { label: 'Total Mothers', value: stats.total_mothers?.toLocaleString(), color: statColors.total },
            { label: 'Critical',      value: stats.critical?.toLocaleString(),       color: statColors.critical },
            { label: 'Due ≤ 7 Days',  value: stats.due_7_days?.toLocaleString(),     color: statColors.due },
          ].map(({ label, value, color }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="w-px h-5 mx-3" style={{ background: 'var(--ccmc-border-s)' }} />}
              <div className="text-center px-2">
                <div className="text-[16px] font-bold leading-none" style={{ color, fontFamily: 'Poppins, sans-serif' }}>{value || '—'}</div>
                <div className="text-[9px] font-semibold mt-0.5 uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Right: controls ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="btn-ghost p-2 rounded-lg"
          style={{ padding: '7px' }}
        >
          {dark
            ? <Sun className="w-4 h-4" style={{ color: '#FBBF24' }} />
            : <Moon className="w-4 h-4" style={{ color: '#1B6BD4' }} />
          }
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={syncing}
          title="Reload Excel database"
          className="btn-ghost p-2 rounded-lg"
          style={{ padding: '7px' }}
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
            style={{ color: syncing ? '#3B9FFF' : 'var(--ccmc-text-sec)' }} />
        </button>

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setShowBell(!showBell)}
            className="btn-ghost p-2 rounded-lg relative"
            style={{ padding: '7px' }}
          >
            <Bell className="w-4 h-4" style={{ color: unread > 0 ? '#3B9FFF' : 'var(--ccmc-text-sec)' }} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: '#EF4444', lineHeight: 1 }}>
                {Math.min(unread, 9)}
              </span>
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50 fade-in"
              style={{
                background: 'var(--ccmc-panel)',
                border: '1px solid var(--ccmc-border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              }}>
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--ccmc-border)' }}>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--ccmc-text)' }}>
                  Notifications
                </span>
                <div className="flex items-center gap-3">
                  {unread > 0 && (
                    <button
                      onClick={() => { clearNotifications(); setShowBell(false); }}
                      className="text-[11px] font-semibold"
                      style={{ color: '#3B9FFF' }}
                    >
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setShowBell(false)} style={{ color: 'var(--ccmc-text-hint)' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                    No new notifications
                  </div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n.id} className="px-4 py-3 flex gap-3 transition-colors"
                    style={{ borderBottom: '1px solid var(--ccmc-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ccmc-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    <div className="mt-0.5 flex-shrink-0">{typeIcon(n.type)}</div>
                    <div>
                      <div className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--ccmc-text)' }}>{n.title}</div>
                      <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--ccmc-text-hint)' }}>{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
