import React, { useState } from 'react';
import { Bell, RefreshCw, Database, Clock, AlertTriangle, CheckCircle, Info, Sun, Moon } from 'lucide-react';

export default function Header({ user, backendOK, lastSync, syncing, onRefresh, notifications, clearNotifications, stats, theme, toggleTheme }) {
  const [showBell, setShowBell] = useState(false);
  const unread = notifications.length;
  const dark   = theme !== 'bright';

  const typeIcon = (type) => {
    if (type === 'SUCCESS') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    if (type === 'ERROR')   return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    return <Info className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0 print:hidden"
      style={{
        background: 'var(--ccmc-panel)',
        borderBottom: '1px solid var(--ccmc-border)',
        transition: 'background 0.25s, border-color 0.25s',
      }}
    >
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        <div>
          <div className="text-xs font-bold tracking-wider" style={{ color: 'var(--ccmc-text)' }}>
            MATERNAL HEALTH COMMAND CENTER
          </div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>
            Coimbatore City Municipal Corporation · {user?.full_access ? 'Full Access' : `Restricted: ${user?.phcs?.join(', ')}`}
          </div>
        </div>
      </div>

      {/* Center: quick stats */}
      {stats && (
        <div className="hidden md:flex items-center gap-4 text-[11px] font-semibold">
          <span style={{ color: 'var(--ccmc-text-sec)' }}>
            <span style={{ color: 'var(--ccmc-text)' }}>{stats.total_mothers?.toLocaleString()}</span> Mothers
          </span>
          <span className="w-px h-4" style={{ background: 'var(--ccmc-border-s)' }} />
          <span style={{ color: 'var(--ccmc-text-sec)' }}>
            <span style={{ color: '#EF4444' }}>{stats.critical}</span> Critical
          </span>
          <span className="w-px h-4" style={{ background: 'var(--ccmc-border-s)' }} />
          <span style={{ color: 'var(--ccmc-text-sec)' }}>
            <span style={{ color: '#F97316' }}>{stats.due_7_days}</span> Due ≤7d
          </span>
        </div>
      )}

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to Bright Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded-lg transition-all"
          style={{
            background: dark ? 'rgba(250,204,21,0.12)' : 'rgba(15,76,129,0.15)',
            border: dark ? '1px solid rgba(250,204,21,0.3)' : '1px solid rgba(25,118,210,0.3)',
            color: dark ? '#FDE047' : '#1976D2',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* DB status */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: backendOK ? 'rgba(22,163,74,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${backendOK ? 'rgba(22,163,74,0.3)' : 'rgba(245,158,11,0.3)'}`,
            color: backendOK ? '#4ADE80' : '#FBBF24',
          }}
        >
          <Database className="w-3 h-3" />
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: backendOK ? '#4ADE80' : '#FBBF24', animation: backendOK ? 'pulse 2s infinite' : 'none' }} />
          {backendOK ? 'EXCEL DB LIVE' : 'OFFLINE'}
        </div>

        {/* Last sync */}
        {lastSync && (
          <div className="hidden md:flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>
            <Clock className="w-3 h-3" />
            {lastSync}
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={onRefresh} disabled={syncing} title="Reload Excel database"
          className="p-1.5 rounded-lg transition-all"
          style={{ background: 'rgba(25,118,210,0.15)', border: '1px solid rgba(25,118,210,0.3)', color: '#42A5F5' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,118,210,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(25,118,210,0.15)'; }}
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>

        {/* Bell */}
        <div className="relative">
          <button onClick={() => setShowBell(!showBell)}
            className="relative p-1.5 rounded-lg transition-all"
            style={{ background: 'var(--ccmc-hover)', color: 'var(--ccmc-text-sec)' }}>
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: '#EF4444' }}>
                {Math.min(unread, 9)}
              </span>
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden z-50"
              style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--ccmc-border)' }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ccmc-text)' }}>
                  System Notifications
                </span>
                {unread > 0 && (
                  <button onClick={() => { clearNotifications(); setShowBell(false); }}
                    className="text-[10px] font-bold" style={{ color: '#42A5F5' }}>
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--ccmc-border)' }}>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--ccmc-text-hint)' }}>
                    No new notifications
                  </div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n.id} className="px-4 py-3 flex gap-2.5">
                    {typeIcon(n.type)}
                    <div>
                      <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--ccmc-text)' }}>{n.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--ccmc-text-sec)' }}>{n.message}</div>
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
