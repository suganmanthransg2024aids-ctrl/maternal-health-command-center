import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, X, Phone, Zap } from 'lucide-react';
import { useTheme } from './ThemeContext';
import LoginPage            from './components/LoginPage';
import Sidebar              from './components/Sidebar';
import Header               from './components/Header';
import DashboardOverview    from './components/DashboardOverview';
import DataValidationCenter from './components/DataValidationCenter';
import PatientExplorer      from './components/PatientExplorer';
import RiskIntelligence     from './components/RiskIntelligence';
import DeliveryMonitoring   from './components/DeliveryMonitoring';
import CallTracking         from './components/CallTracking';
import FollowUpTracking     from './components/FollowUpTracking';
import AlertsCenter         from './components/AlertsCenter';
import PHCAnalytics         from './components/PHCAnalytics';
import Reports              from './components/Reports';
import ExecutiveAnalytics   from './components/ExecutiveAnalytics';
import PatientDrawer        from './components/PatientDrawer';
import DailyWorkflow        from './components/DailyWorkflow';
import ApprovalQueue        from './components/ApprovalQueue';

const API = '/api';

function LoginAlertToast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!toast) return null;
  const items = [
    toast.due_today  > 0 && { icon: Zap,           color: '#DC2626', label: `${toast.due_today} mother${toast.due_today > 1 ? 's' : ''} DUE TODAY` },
    toast.due_3days  > 0 && { icon: AlertTriangle,  color: '#EA580C', label: `${toast.due_3days} due in next 3 days` },
    toast.nc_5x      > 0 && { icon: Phone,          color: '#60A5FA', label: `${toast.nc_5x} mothers unreachable (5+ attempts)` },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-80 rounded-xl shadow-2xl overflow-hidden"
      style={{ background: '#0F1729', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#DC2626' }} />
          <span className="text-xs font-bold" style={{ color: '#FCA5A5', fontFamily: 'Poppins,sans-serif' }}>
            DASHBOARD ALERTS
          </span>
        </div>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded"
          style={{ color: '#94A3B8' }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">
        {items.map(({ icon: Icon, color, label }, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>{label}</span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3">
        <p className="text-[10px]" style={{ color: '#475569' }}>
          Go to Alerts Center for full details
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [user,       setUser]       = useState(null);
  const [activePage, setActivePage] = useState('overview');
  const [stats,      setStats]      = useState(null);
  const [lastSync,   setLastSync]   = useState(null);
  const [syncing,    setSyncing]    = useState(false);
  const [backendOK,  setBackendOK]  = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loginToast, setLoginToast] = useState(null);

  // Auto-sync: tracks backend sync_count to detect Excel reloads
  const syncCountRef = useRef(0);

  // Patient drawer state (global — any page can open it)
  const [drawerUid,  setDrawerUid]  = useState(null);
  // Patient full-page state (for "View Full Record" from drawer)
  const [fullPageUid, setFullPageUid] = useState(null);

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem('hrt_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
    sessionStorage.setItem('hrt_user', JSON.stringify(userData));
    try {
      const r = await fetch(`${API}/alerts?role=${userData.role}`);
      const d = await r.json();
      if ((d.due_today || 0) + (d.due_3days || 0) + (d.nc_5x_count || 0) > 0) {
        setLoginToast({ due_today: d.due_today || 0, due_3days: d.due_3days || 0, nc_5x: d.nc_5x_count || 0 });
      }
    } catch { /* silent */ }
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('hrt_user');
    setActivePage('overview');
    setDrawerUid(null);
  };

  const ping = useCallback(async () => {
    try {
      const r = await fetch(`${API}/health`);
      if (r.ok) {
        const d = await r.json();
        setBackendOK(d.status === 'ONLINE');
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch { setBackendOK(false); }
  }, []);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`${API}/stats?role=${user.role}`);
      if (r.ok) setStats(await r.json());
    } catch { /* silent */ }
  }, [user]);

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/refresh`, { method: 'POST' });
      const data = res.ok ? await res.json() : {};
      await loadStats();
      setLastSync(new Date().toLocaleTimeString());
      const src = data.source === 'google_sheets' ? 'Google Sheets' : 'local file';
      const rec = data.records ? ` — ${data.records.toLocaleString()} mothers loaded` : '';
      pushNotification(
        'Spreadsheet Synced',
        `All PHC patient records refreshed from ${src}${rec}.`,
        'SUCCESS'
      );
    } catch {
      pushNotification('Sync Failed', 'Could not reach backend server.', 'ERROR');
    } finally {
      setSyncing(false);
    }
  };

  const pushNotification = (title, message, type) => {
    setNotifications(prev => [{ id: Date.now(), title, message, type }, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, [ping]);

  useEffect(() => {
    if (user) loadStats();
  }, [user, loadStats]);

  // ── Auto-sync: poll /api/sync-status every 30s ─────────────────────────
  // When the backend detects an Excel file change and reloads, sync_count
  // increments. We pick that up here and refresh the UI automatically.
  useEffect(() => {
    if (!user) return;
    const checkSync = async () => {
      try {
        const r = await fetch(`${API}/sync-status`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.sync_count > syncCountRef.current && syncCountRef.current > 0) {
          await loadStats();
          setLastSync(new Date().toLocaleTimeString());
          pushNotification(
            'Data Auto-Updated',
            `Excel reloaded — ${(d.records || 0).toLocaleString()} records now live.`,
            'SUCCESS'
          );
        }
        syncCountRef.current = d.sync_count;
      } catch { /* silent — backend may be restarting */ }
    };
    checkSync();
    const t = setInterval(checkSync, 10000);
    return () => clearInterval(t);
  }, [user, loadStats]);

  // ── Periodic stats refresh every 10s (catches manual Excel saves) ──────
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => { loadStats(); }, 10000);
    return () => clearInterval(t);
  }, [user, loadStats]);

  // Opens the patient drawer overlay on any page
  const openPatient = (uid) => {
    setDrawerUid(uid);
  };

  // Opens the full patient profile page (from drawer "View Full Record")
  const openPatientFullPage = (uid) => {
    setDrawerUid(null);
    setFullPageUid(uid);
    setActivePage('patient-profile');
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const renderPage = () => {
    const commonProps = { user, openPatient };
    switch (activePage) {
      case 'overview':
        return <DashboardOverview stats={stats} user={user} onRefresh={handleRefresh}
                  syncing={syncing} setActivePage={setActivePage} openPatient={openPatient} />;
      case 'workflow':
        return <DailyWorkflow user={user} />;
      case 'approvals':
        return <ApprovalQueue user={user} />;
      case 'executive':
        return <ExecutiveAnalytics user={user} />;
      case 'validation':
        return <DataValidationCenter user={user} />;
      case 'patients':
        return <PatientExplorer {...commonProps} />;
      case 'patient-profile':
        return <PatientExplorer {...commonProps} defaultUid={fullPageUid}
                  onBack={() => setActivePage('patients')} />;
      case 'risk':
        return <RiskIntelligence {...commonProps} />;
      case 'delivery':
        return <DeliveryMonitoring {...commonProps} />;
      case 'calls':
        return <CallTracking {...commonProps} />;
      case 'followups':
        return <FollowUpTracking {...commonProps} />;
      case 'alerts':
        return <AlertsCenter {...commonProps} setActivePage={setActivePage} />;
      case 'phc':
        return <PHCAnalytics {...commonProps} />;
      case 'reports':
        return <Reports {...commonProps} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 font-semibold uppercase tracking-wider">
              Module coming soon
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--ccmc-bg)' }}>
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
        stats={stats}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          backendOK={backendOK}
          lastSync={lastSync}
          syncing={syncing}
          onRefresh={handleRefresh}
          notifications={notifications}
          clearNotifications={() => setNotifications([])}
          stats={stats}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <main
          className="flex-1 overflow-y-auto"
          style={{
            background: 'var(--ccmc-bg)',
            padding: '28px 28px',
          }}
        >
          {renderPage()}
        </main>
      </div>

      {/* Global Patient Drawer — renders over any page */}
      {drawerUid && (
        <PatientDrawer
          uid={drawerUid}
          user={user}
          onClose={() => setDrawerUid(null)}
          onViewFull={openPatientFullPage}
        />
      )}

      {/* Login alert pop-out */}
      <LoginAlertToast toast={loginToast} onClose={() => setLoginToast(null)} />
    </div>
  );
}
