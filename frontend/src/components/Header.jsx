import React, { useState, useRef } from 'react';
import {
  Bell, RefreshCw, CheckCircle, AlertTriangle, Info,
  Sun, Moon, X, Wifi, WifiOff, Upload, Menu,
} from 'lucide-react';

export default function Header({ user, backendOK, lastSync, syncing, onRefresh, notifications, clearNotifications, stats, theme, toggleTheme, onMenuToggle }) {
  const [showBell,    setShowBell]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadMsg,   setUploadMsg]   = useState(null);
  const fileInputRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append('file', file);
    form.append('role', user.role);
    try {
      const r = await fetch('/api/upload-excel', { method: 'POST', body: form });
      const d = await r.json();
      if (d.success) {
        setUploadMsg({ type: 'ok', text: d.message });
        setTimeout(() => setUploadMsg(null), 6000);
      } else {
        setUploadMsg({ type: 'err', text: d.error || 'Upload failed' });
      }
    } catch {
      setUploadMsg({ type: 'err', text: 'Could not reach server' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  const unread = notifications.length;
  const dark   = theme !== 'bright';

  const typeIcon = (type) => {
    if (type === 'SUCCESS') return <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16A34A' }} />;
    if (type === 'ERROR')   return <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#DC2626' }} />;
    return <Info className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />;
  };

  const liveOkBg    = dark ? 'rgba(22,163,74,0.09)'   : 'linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)';
  const liveOkBd    = dark ? 'rgba(22,163,74,0.22)'   : 'none';
  const liveOkClr   = dark ? '#4ADE80'                : '#15803D';
  const liveOffBg   = dark ? 'rgba(217,119,6,0.09)'   : '#FEF9C3';
  const liveOffBd   = dark ? 'rgba(217,119,6,0.22)'   : 'none';
  const liveOffClr  = dark ? '#FBBF24'                : '#92400E';

  const statColors = dark
    ? { total: '#3B82F6', critical: '#DC2626', due: '#D97706' }
    : { total: '#2563EB', critical: '#DC2626', due: '#EA580C' };

  return (
    <header
      className="flex items-center justify-between px-3 sm:px-6 flex-shrink-0 print:hidden"
      style={{
        height: 64,
        background: dark
          ? 'var(--ccmc-panel)'
          : 'linear-gradient(90deg, #FFFFFF 0%, #F0F9FF 50%, #ECFDF5 100%)',
        borderBottom: dark ? '1px solid var(--ccmc-border)' : '1px solid #E2E8F0',
        boxShadow: dark ? 'none' : '0 1px 0 rgba(255,255,255,0.8), 0 2px 16px rgba(0,0,0,0.04)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* ── Left: breadcrumb + status ───────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="btn-ghost p-2 rounded-lg lg:hidden flex-shrink-0"
          style={{ padding: '7px' }}
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" style={{ color: 'var(--ccmc-text-sec)' }} />
        </button>

        {/* Status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            background: backendOK ? liveOkBg : liveOffBg,
            border: `1px solid ${backendOK ? liveOkBd : liveOffBd}`,
          }}>
          {backendOK
            ? <Wifi className="w-3 h-3" style={{ color: liveOkClr }} />
            : <WifiOff className="w-3 h-3" style={{ color: liveOffClr }} />
          }
          <div className="live-dot" style={{
            background: backendOK ? (dark ? '#16A34A' : '#10B981') : (dark ? '#D97706' : '#F59E0B'),
            animation: backendOK ? undefined : 'none',
          }} />
          <span className="text-[12px] font-semibold" style={{ color: backendOK ? liveOkClr : liveOffClr }}>
            {backendOK ? 'Live' : 'Offline'}
          </span>
          {lastSync && (
            <span className="text-[11px] hidden md:block" style={{ color: 'var(--ccmc-text-hint)' }}>
              · {lastSync}
            </span>
          )}
        </div>

        {/* Page title — hidden on the smallest screens to make room */}
        <div className="hidden sm:block min-w-0">
          <div className="text-[15px] font-bold truncate tracking-tight" style={{ color: 'var(--ccmc-text)' }}>
            {dark ? 'Maternal Health Command Center' : 'CCMC Healthcare Intelligence Center'}
          </div>
          <div className="text-[11px] hidden md:block truncate" style={{ color: 'var(--ccmc-text-hint)' }}>
            {user?.full_access ? (dark ? 'Full Access' : 'Executive Dashboard · Full Access') : `Restricted: ${user?.phcs?.join(', ')}`}
          </div>
        </div>
      </div>

      {/* ── Center: live stats ─────────────────────────────────────── */}
      {stats && (
        <div className="hidden lg:flex items-center gap-1">
          {[
            { label: 'Total Mothers', value: stats.total_mothers?.toLocaleString(), color: statColors.total },
            { label: 'Due ≤ 7 Days',  value: stats.due_7_days?.toLocaleString(),     color: statColors.due },
            { label: 'Overdue EDD',   value: stats.overdue_edd?.toLocaleString(),    color: statColors.critical },
          ].map(({ label, value, color }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="w-px h-6 mx-3" style={{ background: 'var(--ccmc-border-s)' }} />}
              <div className="text-center px-2">
                <div className="text-[18px] font-bold leading-none" style={{ color, fontFamily: 'Poppins, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{value || '—'}</div>
                <div className="text-[10px] font-semibold mt-1 uppercase tracking-wider" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</div>
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
            : <Moon className="w-4 h-4" style={{ color: '#2563EB' }} />
          }
        </button>

        {/* Upload Excel — CHO / DMCHO only */}
        {(user?.role === 'CHO' || user?.role === 'DMCHO') && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload updated Excel file"
              className="btn-ghost p-2 rounded-lg flex items-center gap-1.5"
              style={{ padding: '7px 12px', background: uploading ? 'rgba(22,163,74,0.1)' : 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 8 }}
            >
              <Upload className={`w-3.5 h-3.5 ${uploading ? 'animate-bounce' : ''}`}
                style={{ color: uploading ? '#4ADE80' : '#60A5FA' }} />
              <span className="text-[12px] font-bold hidden sm:inline"
                style={{ color: uploading ? '#4ADE80' : '#60A5FA' }}>
                {uploading ? 'Uploading…' : 'Upload Data'}
              </span>
            </button>
          </>
        )}

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={syncing}
          title="Reload Excel database"
          className="btn-ghost p-2 rounded-lg"
          style={{ padding: '7px' }}
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
            style={{ color: syncing ? '#3B82F6' : 'var(--ccmc-text-sec)' }} />
        </button>

        {/* Upload result toast */}
        {uploadMsg && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3"
            style={{
              background: dark
                ? (uploadMsg.type === 'ok' ? 'rgba(9,25,15,0.97)'  : 'rgba(35,10,10,0.97)')
                : (uploadMsg.type === 'ok' ? '#F0FDF4'             : '#FEF2F2'),
              border: `1px solid ${uploadMsg.type === 'ok' ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)'}`,
            }}>
            {uploadMsg.type === 'ok'
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#16A34A' }} />
              : <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#DC2626' }} />}
            <span className="text-sm font-semibold" style={{ color: dark ? (uploadMsg.type === 'ok' ? '#86EFAC' : '#FCA5A5') : (uploadMsg.type === 'ok' ? '#15803D' : '#B91C1C') }}>
              {uploadMsg.text}
            </span>
            <button onClick={() => setUploadMsg(null)} style={{ color: dark ? '#475569' : '#94A3B8', marginLeft: 8 }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setShowBell(!showBell)}
            className="btn-ghost p-2 rounded-lg relative"
            style={{ padding: '7px' }}
          >
            <Bell className="w-4 h-4" style={{ color: unread > 0 ? '#3B82F6' : 'var(--ccmc-text-sec)' }} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: '#DC2626', lineHeight: 1 }}>
                {Math.min(unread, 9)}
              </span>
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden z-50 fade-in"
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
                      style={{ color: '#3B82F6' }}
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
