import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Activity } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

export default function LoginPage({ onLogin }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [tnHover,  setTnHover]  = useState(false);
  const [ccmcHover,setCcmcHover]= useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Please enter both username and password.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toUpperCase(), password }),
      });
      const data = await res.json();
      if (data.success) { onLogin(data); }
      else { setError(data.message || 'Invalid credentials. Please try again.'); }
    } catch {
      setError('Cannot connect to server. Ensure the backend is running.');
    } finally { setLoading(false); }
  };

  /* ── colour tokens ──────────────────────────────────── */
  const bg        = dark ? 'linear-gradient(135deg,#020617 0%,#0a1628 40%,#0f2240 100%)'
                         : 'linear-gradient(135deg,#DBEAFE 0%,#EFF6FF 50%,#F0F9FF 100%)';
  const cardBg    = dark ? 'rgba(15,23,42,0.85)'   : 'rgba(255,255,255,0.92)';
  const cardBdr   = dark ? 'rgba(30,58,95,0.8)'    : 'rgba(148,163,184,0.4)';
  const cardShadow= dark ? '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
                         : '0 25px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)';
  const heroBg    = dark ? 'rgba(10,22,44,0.82)'   : 'rgba(255,255,255,0.88)';
  const heroBdr   = dark ? 'rgba(30,58,95,0.7)'    : 'rgba(148,163,184,0.35)';
  const inputBg   = dark ? 'rgba(30,41,59,0.8)'    : 'rgba(248,250,252,0.95)';
  const inputBdr  = dark ? 'rgba(30,58,95,0.8)'    : 'rgba(148,163,184,0.5)';
  const textMain  = dark ? '#F1F5F9' : '#1E293B';
  const textSec   = dark ? '#94A3B8' : '#475569';
  const textHint  = dark ? '#475569' : '#94A3B8';
  const footerBg  = dark ? 'rgba(2,6,23,0.5)' : 'rgba(241,245,249,0.8)';
  const hintBox   = dark ? 'rgba(15,76,129,0.1)' : 'rgba(219,234,254,0.6)';
  const hintBdr   = dark ? 'rgba(15,76,129,0.3)' : 'rgba(147,197,253,0.5)';
  const orb1      = dark ? '#1976D2' : '#BFDBFE';
  const orb2      = dark ? '#42A5F5' : '#93C5FD';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-8"
      style={{ background: bg }}>

      <style>{`
        @keyframes ccmcLogoPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.9; transform: scale(1.1); }
        }
        @keyframes ccmcRingRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle,${orb1},transparent)`, filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle,${orb2},transparent)`, filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle,#0F4C81,transparent)', filter: 'blur(80px)' }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          opacity: dark ? 0.05 : 0.04,
          backgroundImage: 'linear-gradient(rgba(66,165,245,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(66,165,245,0.4) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      {/* ── HERO BANNER — Three prominent images ──────────────────────── */}
      <div className="relative z-10 w-full max-w-4xl px-4 mb-6">
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: heroBg,
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: `1px solid ${heroBdr}`,
            boxShadow: dark
              ? '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 24px 80px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Indian tricolour accent bar */}
          <div className="flex h-1.5">
            <div className="flex-1" style={{ background: '#FF9933' }} />
            <div className="flex-1" style={{ background: '#FFFFFF' }} />
            <div className="flex-1" style={{ background: '#138808' }} />
          </div>

          {/* Three-column image section */}
          <div className="px-8 py-7 flex items-center justify-between gap-6">

            {/* ── LEFT: Tamil Nadu Government ── */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div
                style={{ position: 'relative', width: 136, height: 136 }}
                onMouseEnter={() => setTnHover(true)}
                onMouseLeave={() => setTnHover(false)}
              >
                {/* Outer ambient glow — pulsing */}
                <div style={{
                  position: 'absolute', inset: -16, borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(204,0,0,${tnHover ? 0.5 : 0.22}), rgba(255,153,0,${tnHover ? 0.18 : 0.08}), transparent 70%)`,
                  filter: 'blur(14px)',
                  animation: 'ccmcLogoPulse 3s ease-in-out infinite',
                  transition: 'background 0.4s ease',
                  pointerEvents: 'none',
                }} />
                {/* India tricolor conic border ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'conic-gradient(from 90deg, #FF9933 0deg 120deg, #FFFFFF 120deg 240deg, #138808 240deg 360deg)',
                  opacity: tnHover ? 0.9 : 0.55,
                  transform: tnHover ? 'scale(1.07)' : 'scale(1)',
                  transition: 'all 0.5s ease',
                  pointerEvents: 'none',
                }} />
                {/* Inner mask to turn ring into a border */}
                <div style={{
                  position: 'absolute', inset: 3, borderRadius: '50%',
                  background: dark ? '#071220' : '#eef4ff',
                  pointerEvents: 'none',
                }} />
                {/* Second inner decorative ring — thin gold accent */}
                <div style={{
                  position: 'absolute', inset: 5, borderRadius: '50%',
                  background: 'conic-gradient(from 270deg, rgba(255,200,50,0.7), transparent 40%, rgba(255,200,50,0.4) 70%, transparent)',
                  opacity: tnHover ? 0.7 : 0.35,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: 'none',
                }} />
                {/* Glass logo container */}
                <div style={{
                  position: 'absolute', inset: 7, borderRadius: '50%',
                  background: dark
                    ? 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(15,8,30,0.6) 100%)'
                    : 'linear-gradient(145deg, #ffffff 0%, rgba(240,245,255,0.96) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,1)'}`,
                  boxShadow: tnHover
                    ? `0 22px 50px rgba(0,0,0,0.5), 0 0 36px rgba(204,0,0,0.3), 0 0 60px rgba(204,0,0,0.12), inset 0 2px 2px rgba(255,255,255,0.55), inset 0 -2px 2px rgba(0,0,0,0.18)`
                    : `0 10px 30px rgba(0,0,0,0.32), 0 0 16px rgba(204,0,0,0.14), inset 0 2px 1px rgba(255,255,255,0.45), inset 0 -2px 1px rgba(0,0,0,0.1)`,
                  transform: tnHover ? 'scale(1.13) translateY(-6px)' : 'scale(1) translateY(0)',
                  transition: 'all 0.42s cubic-bezier(0.34,1.56,0.64,1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {/* Specular dome highlight — 3D glass effect */}
                  <div style={{
                    position: 'absolute', top: 6, left: '16%', right: '16%', height: '40%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 60%, transparent 100%)',
                    borderRadius: '50% 50% 0 0 / 65% 65% 0 0',
                    pointerEvents: 'none', zIndex: 2,
                  }} />
                  {/* Bottom reflection — depth illusion */}
                  <div style={{
                    position: 'absolute', bottom: 5, left: '22%', right: '22%', height: '20%',
                    background: 'linear-gradient(0deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                    borderRadius: '0 0 50% 50% / 0 0 40% 40%',
                    pointerEvents: 'none', zIndex: 2,
                  }} />
                  <img
                    src="/images/tn-gov.png"
                    alt="Government of Tamil Nadu"
                    style={{
                      width: 84, height: 84, objectFit: 'contain',
                      position: 'relative', zIndex: 1,
                      filter: `drop-shadow(0 3px 8px rgba(0,0,0,0.28)) ${tnHover ? 'drop-shadow(0 0 10px rgba(204,0,0,0.35))' : ''}`,
                      transition: 'filter 0.4s ease',
                    }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div style={{ display: 'none', width: 84, height: 84, alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    <svg viewBox="0 0 40 40" style={{ width: 68, height: 68 }}>
                      <circle cx="20" cy="20" r="18" fill="#8B0000" />
                      <text x="20" y="25" textAnchor="middle" fill="gold" fontSize="11" fontWeight="bold">TN</text>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold tracking-widest leading-tight" style={{ color: dark ? '#CBD5E1' : '#374151' }}>
                  GOVERNMENT OF
                </div>
                <div className="text-[13px] font-extrabold tracking-wider mt-0.5" style={{ color: '#CC0000' }}>
                  TAMIL NADU
                </div>
                <div className="text-[9px] tracking-widest mt-1 font-medium" style={{ color: textHint }}>
                  TRUTH ALONE TRIUMPHS
                </div>
              </div>
            </div>

            {/* ── CENTRE: Mother & Baby (main focus) ── */}
            <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
              <div className="text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                style={{ background: 'rgba(25,118,210,0.12)', color: '#42A5F5', border: '1px solid rgba(25,118,210,0.25)', letterSpacing: '0.2em' }}>
                NATIONAL HEALTH MISSION
              </div>

              <div className="relative">
                <div
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(circle,rgba(25,118,210,0.4),transparent 70%)', filter: 'blur(24px)', transform: 'scale(1.3)' }}
                />
                <div
                  className="relative overflow-hidden rounded-2xl"
                  style={{
                    boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 0 2px rgba(66,165,245,0.2)',
                    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                  }}
                >
                  <img
                    src="/images/mother-baby.png"
                    alt="Maternal & Child Health"
                    style={{ width: 180, height: 180, objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div style={{ display: 'none', width: 180, height: 180, alignItems: 'center', justifyContent: 'center', background: 'rgba(25,118,210,0.1)' }}>
                    <Activity style={{ width: 64, height: 64, color: '#1976D2' }} />
                  </div>
                </div>
              </div>

              <div className="text-center px-2">
                <div
                  className="text-[15px] font-extrabold tracking-wide leading-tight"
                  style={{
                    background: 'linear-gradient(135deg,#42A5F5,#1976D2,#0F4C81)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}
                >
                  MATERNAL HEALTH
                </div>
                <div
                  className="text-[13px] font-extrabold tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg,#60B8FF,#42A5F5)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}
                >
                  MONITORING SYSTEM
                </div>
                <div className="text-[9px] tracking-widest mt-1 font-medium" style={{ color: textHint }}>
                  HIGH RISK MOTHER TRACKER · CCMC
                </div>
              </div>
            </div>

            {/* ── RIGHT: CCMC Logo ── */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div
                style={{ position: 'relative', width: 136, height: 136 }}
                onMouseEnter={() => setCcmcHover(true)}
                onMouseLeave={() => setCcmcHover(false)}
              >
                {/* Outer ambient glow — blue pulsing, offset timing */}
                <div style={{
                  position: 'absolute', inset: -16, borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(25,118,210,${ccmcHover ? 0.6 : 0.28}), rgba(66,165,245,${ccmcHover ? 0.25 : 0.1}), transparent 70%)`,
                  filter: 'blur(16px)',
                  animation: 'ccmcLogoPulse 3s ease-in-out infinite',
                  animationDelay: '0.5s',
                  transition: 'background 0.4s ease',
                  pointerEvents: 'none',
                }} />
                {/* Blue conic gradient border ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, #0F4C81 0deg, #1976D2 60deg, #42A5F5 120deg, #60CFFF 180deg, #42A5F5 240deg, #1976D2 300deg, #0F4C81 360deg)',
                  opacity: ccmcHover ? 0.95 : 0.62,
                  transform: ccmcHover ? 'scale(1.07)' : 'scale(1)',
                  transition: 'all 0.5s ease',
                  pointerEvents: 'none',
                }} />
                {/* Inner mask */}
                <div style={{
                  position: 'absolute', inset: 3, borderRadius: '50%',
                  background: dark ? '#071220' : '#eef4ff',
                  pointerEvents: 'none',
                }} />
                {/* Second inner decorative ring — cyan accent */}
                <div style={{
                  position: 'absolute', inset: 5, borderRadius: '50%',
                  background: 'conic-gradient(from 180deg, rgba(66,165,245,0.6), transparent 40%, rgba(96,207,255,0.45) 70%, transparent)',
                  opacity: ccmcHover ? 0.75 : 0.38,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: 'none',
                }} />
                {/* Glass logo container */}
                <div style={{
                  position: 'absolute', inset: 7, borderRadius: '50%',
                  background: dark
                    ? 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(10,22,50,0.65) 100%)'
                    : 'linear-gradient(145deg, #ffffff 0%, rgba(224,242,255,0.97) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${dark ? 'rgba(66,165,245,0.22)' : 'rgba(255,255,255,1)'}`,
                  boxShadow: ccmcHover
                    ? `0 22px 50px rgba(0,0,0,0.48), 0 0 40px rgba(25,118,210,0.5), 0 0 70px rgba(25,118,210,0.2), inset 0 2px 2px rgba(255,255,255,0.55), inset 0 -2px 2px rgba(0,0,0,0.14)`
                    : `0 10px 30px rgba(0,0,0,0.3), 0 0 22px rgba(25,118,210,0.22), inset 0 2px 1px rgba(255,255,255,0.45), inset 0 -2px 1px rgba(0,0,0,0.1)`,
                  transform: ccmcHover ? 'scale(1.13) translateY(-6px)' : 'scale(1) translateY(0)',
                  transition: 'all 0.42s cubic-bezier(0.34,1.56,0.64,1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {/* Specular dome highlight */}
                  <div style={{
                    position: 'absolute', top: 6, left: '16%', right: '16%', height: '40%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
                    borderRadius: '50% 50% 0 0 / 65% 65% 0 0',
                    pointerEvents: 'none', zIndex: 2,
                  }} />
                  {/* Bottom reflection */}
                  <div style={{
                    position: 'absolute', bottom: 5, left: '22%', right: '22%', height: '20%',
                    background: 'linear-gradient(0deg, rgba(66,165,245,0.15) 0%, transparent 100%)',
                    borderRadius: '0 0 50% 50% / 0 0 40% 40%',
                    pointerEvents: 'none', zIndex: 2,
                  }} />
                  <img
                    src="/images/ccmc-logo.png"
                    alt="CCMC – Coimbatore City Municipal Corporation"
                    style={{
                      width: 84, height: 84, objectFit: 'contain',
                      position: 'relative', zIndex: 1,
                      filter: `drop-shadow(0 3px 8px rgba(0,0,0,0.22)) ${ccmcHover ? 'drop-shadow(0 0 12px rgba(25,118,210,0.45))' : ''}`,
                      transition: 'filter 0.4s ease',
                    }}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div style={{ display: 'none', width: 84, height: 84, alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg,#0F4C81,#1976D2)', borderRadius: '50%', position: 'relative', zIndex: 1 }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>CCMC</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[13px] font-extrabold tracking-wider leading-tight" style={{ color: '#42A5F5' }}>
                  CCMC
                </div>
                <div className="text-[11px] font-bold tracking-widest mt-0.5" style={{ color: dark ? '#CBD5E1' : '#374151' }}>
                  COIMBATORE
                </div>
                <div className="text-[9px] tracking-widest mt-1 font-medium" style={{ color: textHint }}>
                  CITY MUNICIPAL CORP
                </div>
              </div>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg,#0F4C81,#1976D2,#42A5F5,#1976D2,#0F4C81)' }} />
        </div>
      </div>

      {/* ── Main login card ─────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md mx-4"
        style={{
          background: cardBg,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${cardBdr}`,
          borderRadius: '20px',
          boxShadow: cardShadow,
        }}>

        {/* Gradient top bar */}
        <div className="h-1 rounded-t-[20px]"
          style={{ background: 'linear-gradient(90deg,#0F4C81,#1976D2,#42A5F5)' }} />

        <div className="px-8 py-7">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0F4C81,#1976D2)', boxShadow: '0 8px 24px rgba(25,118,210,0.4)' }}>
              <Activity className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-7">
            <h1 className="text-xl font-bold tracking-wider mb-1"
              style={{
                fontFamily: 'Poppins,Inter,sans-serif',
                background: 'linear-gradient(135deg,#42A5F5,#1976D2)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              HIGH RISK MOTHER TRACKER
            </h1>
            <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: textSec }}>
              CCMC – Coimbatore City Municipal Corporation
            </div>
            <div className="text-xs" style={{ color: textHint }}>
              Maternal Health Monitoring & Decision Support Platform
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textSec }}>
                User ID
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#42A5F5' }} />
                <select value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: textMain, appearance: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = '#1976D2'}
                  onBlur={(e)  => e.target.style.borderColor = inputBdr}>
                  <option value="">— Select User —</option>
                  <optgroup label="Administration" style={{ background: dark ? '#0F172A' : '#F8FAFC' }}>
                    <option value="DMCHO">DMCHO</option>
                    <option value="CHO">CHO</option>
                  </optgroup>
                  <optgroup label="Health Resource Team" style={{ background: dark ? '#0F172A' : '#F8FAFC' }}>
                    <option value="HRT1">HRT1 – Abarna D</option>
                    <option value="HRT2">HRT2 – Girija</option>
                    <option value="HRT3">HRT3 – Nivetha</option>
                    <option value="HRT4">HRT4 – Pavithraa M</option>
                    <option value="HRT5">HRT5 – Pavithra</option>
                    <option value="HRT6">HRT6 – Ishwarya</option>
                    <option value="HRT7">HRT7 – Swetha</option>
                    <option value="HRT8">HRT8 – Abarna V</option>
                  </optgroup>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4" style={{ color: textHint }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: textSec }}>
                Password
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#42A5F5' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: inputBg, border: `1px solid ${inputBdr}`, color: textMain }}
                  onFocus={(e) => e.target.style.borderColor = '#1976D2'}
                  onBlur={(e)  => e.target.style.borderColor = inputBdr} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: textHint }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-xs"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all mt-2"
              style={{
                background: loading ? 'rgba(15,76,129,0.5)' : 'linear-gradient(135deg,#0F4C81,#1976D2,#42A5F5)',
                color: 'white',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(25,118,210,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : 'SECURE LOGIN'}
            </button>
          </form>

          {/* Credentials hint */}
          <div className="mt-5 p-3 rounded-lg text-center"
            style={{ background: hintBox, border: `1px solid ${hintBdr}` }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: textHint }}>
              Default Credentials
            </div>
            <div className="text-[10px] leading-relaxed" style={{ color: textSec }}>
              DMCHO → dmcho@2024 &nbsp;|&nbsp; CHO → cho@2024
              <br />
              HRT1 → hrt1@2024 &nbsp;&nbsp;&nbsp; (HRT2–8 follow same pattern)
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="px-8 py-3 rounded-b-[20px] flex items-center justify-between"
          style={{ background: footerBg, borderTop: `1px solid ${cardBdr}` }}>
          <div className="text-[10px]" style={{ color: textHint }}>Secure Government Healthcare System</div>
          <div className="text-[10px]" style={{ color: textHint }}>CCMC · MATERNAL HEALTH 2024</div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="relative z-10 mt-6 text-center">
        <p className="text-xs" style={{ color: textHint }}>
          Coimbatore City Municipal Corporation — Maternal Healthcare Division
        </p>
        <p className="text-[10px] mt-1" style={{ color: dark ? '#334155' : '#94A3B8' }}>
          Authorized Personnel Only · All Access Logged
        </p>
      </div>
    </div>
  );
}
