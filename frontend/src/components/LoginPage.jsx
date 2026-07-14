import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Please select a user and enter password.'); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toUpperCase(), password }),
      });
      const data = await res.json();
      if (data.success) { onLogin(data); }
      else { setError(data.message || 'Invalid credentials. Please try again.'); }
    } catch {
      setError('Cannot connect to server. Ensure the backend is running.');
    } finally { setLoading(false); }
  };

  const bg       = dark ? '#060D1B' : '#EDF2F9';
  const bannerBg = dark ? 'rgba(10,20,42,0.92)' : 'rgba(255,255,255,0.95)';
  const bannerBd = dark ? 'rgba(30,70,130,0.6)'  : 'rgba(148,163,184,0.35)';
  const textMain = dark ? '#F0F6FF' : '#0F1C2E';
  const textSec  = dark ? '#8BACC8' : '#3D5A7A';
  const textHint = dark ? '#445E7A' : '#7A9BB5';
  const inputBg  = dark ? 'rgba(16,32,56,0.9)'  : 'rgba(248,251,255,0.98)';
  const inputBd  = dark ? 'rgba(26,53,88,0.9)'  : 'rgba(148,163,184,0.55)';
  const cardBg   = dark ? 'rgba(11,22,40,0.97)' : 'rgba(255,255,255,0.98)';
  const cardBd   = dark ? 'rgba(26,53,88,0.9)'  : 'rgba(148,163,184,0.4)';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-10 px-4 relative overflow-hidden"
      style={{ background: bg }}
    >
      {/* ── Background glows ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '80vw', height: '60vw', borderRadius: '50%',
          background: dark
            ? 'radial-gradient(circle, rgba(27,107,212,0.12) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(59,159,255,0.1) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute',
          backgroundImage: `linear-gradient(${dark ? 'rgba(59,159,255,0.03)' : 'rgba(27,107,212,0.04)'} 1px, transparent 1px),
                            linear-gradient(90deg, ${dark ? 'rgba(59,159,255,0.03)' : 'rgba(27,107,212,0.04)'} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          inset: 0,
        }} />
      </div>

      <div className="relative z-10 w-full max-w-3xl">

        {/* ══════════════════════════════════════════════════════════════
            HERO BANNER — TN Gov | Mother-Baby | CCMC
        ══════════════════════════════════════════════════════════════ */}
        <div
          className="w-full rounded-2xl overflow-hidden mb-5"
          style={{
            background: bannerBg,
            border: `1px solid ${bannerBd}`,
            boxShadow: dark
              ? '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,159,255,0.05) inset'
              : '0 20px 60px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Indian tricolor top bar */}
          <div className="flex h-1.5">
            <div className="flex-1" style={{ background: '#FF9933' }} />
            <div className="flex-1" style={{ background: '#FFFFFF' }} />
            <div className="flex-1" style={{ background: '#138808' }} />
          </div>

          {/* NHM badge */}
          <div className="flex justify-center pt-5 pb-1">
            <div
              className="px-5 py-1.5 rounded-full text-[10px] font-bold tracking-[0.22em] uppercase"
              style={{
                border: `1px solid ${dark ? 'rgba(59,159,255,0.45)' : 'rgba(27,107,212,0.35)'}`,
                color: dark ? '#3B9FFF' : '#1B6BD4',
                background: dark ? 'rgba(59,159,255,0.07)' : 'rgba(27,107,212,0.06)',
              }}
            >
              National Health Mission
            </div>
          </div>

          {/* Three-column logos — stacked on phones, identical row ≥640px */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-10 py-6 gap-6 sm:gap-4">

            {/* ── LEFT: TN Government ─────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 flex-1">
              {/* Circular logo with tricolor ring */}
              <div className="relative" style={{ width: 'clamp(72px, 19vw, 120px)', height: 'clamp(72px, 19vw, 120px)' }}>
                {/* Outer tricolor conic ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'conic-gradient(from 90deg, #FF9933 0deg 120deg, #FFFFFF 120deg 240deg, #138808 240deg 360deg)',
                  opacity: 0.85,
                }} />
                {/* Inner mask */}
                <div style={{
                  position: 'absolute', inset: 3, borderRadius: '50%',
                  background: dark ? '#0A1830' : '#EDF2F9',
                }} />
                {/* Logo container */}
                <div style={{
                  position: 'absolute', inset: 6, borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}>
                  <img
                    src="/images/tn-gov.png"
                    alt="Government of Tamil Nadu"
                    style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML =
                        '<div style="font-size:10px;font-weight:800;color:#8B0000;text-align:center;line-height:1.3;padding:4px">GOVT<br/>OF<br/>TN</div>';
                    }}
                  />
                </div>
              </div>
              {/* Text */}
              <div className="text-center">
                <div className="text-[12px] font-bold tracking-wider" style={{ color: textMain }}>
                  GOVERNMENT OF
                </div>
                <div className="text-[14px] font-extrabold tracking-wider" style={{ color: '#CC0000' }}>
                  TAMIL NADU
                </div>
                <div className="text-[9px] font-semibold tracking-[0.18em] mt-1 uppercase" style={{ color: textHint }}>
                  Truth Alone Triumphs
                </div>
              </div>
            </div>

            {/* ── CENTER: Mother & Baby ────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              {/* Large image card */}
              <div
                style={{
                  width: 'clamp(104px, 28vw, 180px)', height: 'clamp(104px, 28vw, 180px)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `2px solid ${dark ? 'rgba(59,159,255,0.35)' : 'rgba(27,107,212,0.25)'}`,
                  boxShadow: dark
                    ? '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,159,255,0.15) inset'
                    : '0 12px 40px rgba(0,0,0,0.15)',
                  background: dark ? 'rgba(59,159,255,0.05)' : '#E8EFF8',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/images/mother-baby.png"
                  alt="Maternal & Child Health"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.display = 'flex';
                    e.target.parentElement.style.alignItems = 'center';
                    e.target.parentElement.style.justifyContent = 'center';
                    e.target.parentElement.innerHTML =
                      '<svg viewBox="0 0 24 24" fill="none" style="width:72px;height:72px;stroke:rgba(59,159,255,0.5);stroke-width:1.2"><path d="M12 21C12 21 4 16 4 9.5C4 7 6 5 8.5 5C10 5 11.5 5.8 12 7C12.5 5.8 14 5 15.5 5C18 5 20 7 20 9.5C20 16 12 21 12 21Z" stroke-linejoin="round"/><path d="M9 11.5H15M12 8.5V14.5" stroke-linecap="round"/></svg>';
                  }}
                />
              </div>
              {/* Text */}
              <div className="text-center">
                <div
                  className="text-[15px] font-extrabold tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, #3B9FFF, #1B6BD4)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}
                >
                  MATERNAL HEALTH
                </div>
                <div className="text-[12px] font-bold tracking-wider" style={{ color: textMain }}>
                  MONITORING SYSTEM
                </div>
                <div className="text-[9px] font-semibold tracking-widest mt-1 uppercase" style={{ color: textHint }}>
                  High Risk Mother Tracker · CCMC
                </div>
              </div>
            </div>

            {/* ── RIGHT: CCMC ─────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 flex-1">
              {/* Circular logo with blue ring */}
              <div className="relative" style={{ width: 'clamp(72px, 19vw, 120px)', height: 'clamp(72px, 19vw, 120px)' }}>
                {/* Outer blue conic ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, #0F4C81 0deg, #1B6BD4 90deg, #3B9FFF 180deg, #1B6BD4 270deg, #0F4C81 360deg)',
                  opacity: 0.8,
                }} />
                {/* Inner mask */}
                <div style={{
                  position: 'absolute', inset: 3, borderRadius: '50%',
                  background: dark ? '#0A1830' : '#EDF2F9',
                }} />
                {/* Logo container */}
                <div style={{
                  position: 'absolute', inset: 6, borderRadius: '50%',
                  background: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}>
                  <img
                    src="/images/ccmc-logo.png"
                    alt="CCMC – Coimbatore City Municipal Corporation"
                    style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML =
                        '<div style="font-size:11px;font-weight:800;color:#1B6BD4;text-align:center;line-height:1.3;padding:4px">CCMC</div>';
                    }}
                  />
                </div>
              </div>
              {/* Text */}
              <div className="text-center">
                <div className="text-[14px] font-extrabold tracking-wider" style={{ color: '#3B9FFF' }}>
                  CCMC
                </div>
                <div className="text-[12px] font-bold tracking-wider" style={{ color: textMain }}>
                  COIMBATORE
                </div>
                <div className="text-[9px] font-semibold tracking-[0.18em] mt-1 uppercase" style={{ color: textHint }}>
                  City Municipal Corp
                </div>
              </div>
            </div>
          </div>

          {/* Blue gradient accent bottom bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #0F4C81, #1B6BD4, #3B9FFF, #1B6BD4, #0F4C81)' }} />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            LOGIN CARD
        ══════════════════════════════════════════════════════════════ */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: cardBg,
            border: `1px solid ${cardBd}`,
            boxShadow: dark
              ? '0 20px 60px rgba(0,0,0,0.5)'
              : '0 20px 60px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Top accent line */}
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #1B6BD4 40%, #3B9FFF 60%, transparent)' }} />

          <div className="px-5 sm:px-10 py-8">
            <div className="flex items-start gap-10">

              {/* Form section */}
              <div className="flex-1">
                <div className="mb-6">
                  <h2 className="text-[20px] font-bold mb-1"
                    style={{ color: textMain, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.2px' }}>
                    Secure Sign In
                  </h2>
                  <p className="text-[12px]" style={{ color: textHint }}>
                    Authorized personnel only · All access is logged
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* User dropdown */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: textSec }}>
                      User ID
                    </label>
                    <div className="relative">
                      <select
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 rounded-xl text-[13px] font-medium outline-none transition-all"
                        style={{ background: inputBg, border: `1px solid ${inputBd}`, color: textMain, appearance: 'none', cursor: 'pointer' }}
                        onFocus={(e) => { e.target.style.borderColor = '#1B6BD4'; e.target.style.boxShadow = '0 0 0 3px rgba(27,107,212,0.15)'; }}
                        onBlur={(e)  => { e.target.style.borderColor = inputBd;   e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="">— Select User —</option>
                        <optgroup label="Administration" style={{ background: dark ? '#0B1628' : '#F8FAFC' }}>
                          <option value="CHO">CHO — City Health Officer</option>
                          <option value="DMCHO">DMCHO — District MCH Officer</option>
                        </optgroup>
                        <optgroup label="Tracking Team" style={{ background: dark ? '#0B1628' : '#F8FAFC' }}>
                          <option value="HRT1">HRT1 — Abarna D</option>
                          <option value="HRT2">HRT2 — Girija</option>
                          <option value="HRT3">HRT3 — Nivetha</option>
                          <option value="HRT4">HRT4 — Pavithraa M</option>
                          <option value="HRT5">HRT5 — Pavithra</option>
                          <option value="HRT6">HRT6 — Ishwarya</option>
                          <option value="HRT7">HRT7 — Swetha</option>
                          <option value="HRT8">HRT8 — Abarna V</option>
                        </optgroup>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: textHint }} />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: textSec }}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-4 pr-11 py-3 rounded-xl text-[13px] outline-none transition-all"
                        style={{ background: inputBg, border: `1px solid ${inputBd}`, color: textMain }}
                        onFocus={(e) => { e.target.style.borderColor = '#1B6BD4'; e.target.style.boxShadow = '0 0 0 3px rgba(27,107,212,0.15)'; }}
                        onBlur={(e)  => { e.target.style.borderColor = inputBd;   e.target.style.boxShadow = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: textHint }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = textSec; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = textHint; }}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl text-[12px]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-[13px] font-bold tracking-wider uppercase transition-all mt-1"
                    style={{
                      background: loading ? 'rgba(15,76,129,0.45)' : 'linear-gradient(135deg, #0F4C81, #1B6BD4)',
                      color: 'white',
                      border: 'none',
                      boxShadow: loading ? 'none' : '0 4px 20px rgba(27,107,212,0.4)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '0 6px 28px rgba(27,107,212,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(27,107,212,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Authenticating…
                      </span>
                    ) : 'Secure Login'}
                  </button>
                </form>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px self-stretch" style={{ background: dark ? 'rgba(26,53,88,0.8)' : 'rgba(148,163,184,0.3)' }} />

              {/* Credentials hint */}
              <div className="hidden md:flex flex-col gap-3 w-52 flex-shrink-0 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textHint }}>
                  Default Credentials
                </div>

                {/* CHO — highlighted first */}
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#34D399' }}>
                    City Health Officer
                  </div>
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(52,211,153,0.4)', background: dark ? 'rgba(52,211,153,0.08)' : 'rgba(209,250,229,0.5)' }}>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }} />
                        <span className="text-[12px] font-bold" style={{ color: dark ? '#34D399' : '#059669' }}>CHO</span>
                      </div>
                      <code className="text-[11px] font-mono font-semibold" style={{ color: dark ? '#34D399' : '#047857' }}>cho@2026</code>
                    </div>
                  </div>
                </div>

                {/* Administration */}
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: textHint }}>
                    Administration
                  </div>
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${dark ? 'rgba(26,53,88,0.5)' : 'rgba(147,197,253,0.35)'}`, background: dark ? 'rgba(26,53,88,0.3)' : 'rgba(219,234,254,0.4)' }}>
                    <div className="flex items-center justify-between px-3 py-2.5"
                      style={{ borderBottom: `1px solid ${dark ? 'rgba(26,53,88,0.5)' : 'rgba(147,197,253,0.25)'}` }}>
                      <span className="text-[11px] font-semibold" style={{ color: textSec }}>DMCHO</span>
                      <code className="text-[10px] font-mono" style={{ color: dark ? '#3B9FFF' : '#1B6BD4' }}>dmcho@2026</code>
                    </div>
                  </div>
                </div>

                {/* HRT Officers */}
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: textHint }}>
                    HRT Officers
                  </div>
                  <div className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${dark ? 'rgba(26,53,88,0.5)' : 'rgba(147,197,253,0.35)'}`, background: dark ? 'rgba(26,53,88,0.3)' : 'rgba(219,234,254,0.4)' }}>
                    {[
                      { user: 'HRT1', pass: 'hrt1@2026' },
                      { user: 'HRT2', pass: 'hrt2@2026' },
                    ].map(({ user, pass }, i, arr) => (
                      <div key={user} className="flex items-center justify-between px-3 py-2"
                        style={{ borderBottom: i < arr.length - 1 ? `1px solid ${dark ? 'rgba(26,53,88,0.5)' : 'rgba(147,197,253,0.25)'}` : 'none' }}>
                        <span className="text-[11px] font-semibold" style={{ color: textSec }}>{user}</span>
                        <code className="text-[10px] font-mono" style={{ color: dark ? '#3B9FFF' : '#1B6BD4' }}>{pass}</code>
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] mt-1.5 leading-relaxed" style={{ color: textHint }}>
                    HRT3–8 follow the same pattern
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-10 py-3 flex items-center justify-between flex-wrap gap-1"
            style={{ borderTop: `1px solid ${cardBd}`, background: dark ? 'rgba(6,13,27,0.4)' : 'rgba(237,242,249,0.6)' }}>
            <span className="text-[10px]" style={{ color: textHint }}>Secure Government Healthcare System</span>
            <span className="text-[10px]" style={{ color: textHint }}>CCMC · Maternal Health · 2026</span>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-[10px] mt-4" style={{ color: dark ? '#1E3A5A' : '#94A3B8' }}>
          Coimbatore City Municipal Corporation — Maternal Healthcare Division · Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
