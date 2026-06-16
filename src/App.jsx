import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const API = '/api';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [user,       setUser]       = useState(null);
  const [activePage, setActivePage] = useState('overview');
  const [stats,      setStats]      = useState(null);
  const [lastSync,   setLastSync]   = useState(null);
  const [syncing,    setSyncing]    = useState(false);
  const [backendOK,  setBackendOK]  = useState(false);
  const [notifications, setNotifications] = useState([]);

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

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('hrt_user', JSON.stringify(userData));
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
      await fetch(`${API}/refresh`, { method: 'POST' });
      await loadStats();
      setLastSync(new Date().toLocaleTimeString());
      pushNotification('Database Synced', 'All patient records reloaded from Excel source.', 'SUCCESS');
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
    const t = setInterval(checkSync, 30000);
    return () => clearInterval(t);
  }, [user, loadStats]);

  // ── Periodic stats refresh every 60 s (catches manual Excel saves) ─────
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => { loadStats(); }, 60000);
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
          className="flex-1 overflow-y-auto p-6"
          style={{ background: 'var(--ccmc-bg)' }}
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
    </div>
  );
}
