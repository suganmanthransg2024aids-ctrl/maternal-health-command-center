import React, { useEffect, useState } from 'react';
import { Baby, RefreshCw, ChevronRight } from 'lucide-react';

const API = '/api';

export default function DeliveryTimeline({ user, setActivePage }) {
  const [timeline, setTimeline] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [hovered,  setHovered]  = useState(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    fetch(`${API}/delivery-timeline?role=${user.role}`)
      .then(r => r.json())
      .then(d => {
        setTimeline(d.timeline || []);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 flex items-center justify-center"
        style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)', minHeight: 200 }}>
        <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--ccmc-text-hint)' }} />
      </div>
    );
  }

  const maxCount = Math.max(...timeline.map(d => d.count), 1);

  // Show every other label to avoid clutter
  const showLabel = (i) => i === 0 || i % 5 === 0 || i === 30;

  // Group into weeks for the summary strip
  const weeks = [
    { label: 'Today',    days: timeline.slice(0,  1),  color: '#EF4444' },
    { label: 'Week 1',   days: timeline.slice(1,  8),  color: '#F97316' },
    { label: 'Week 2',   days: timeline.slice(8,  15), color: '#A78BFA' },
    { label: 'Week 3',   days: timeline.slice(15, 22), color: '#60A5FA' },
    { label: 'Week 4+',  days: timeline.slice(22, 31), color: '#22C55E' },
  ].map(w => ({ ...w, count: w.days.reduce((s, d) => s + d.count, 0) }));

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center gap-2">
          <Baby className="w-4 h-4" style={{ color: '#A78BFA' }} />
          <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
            Upcoming Deliveries — Next 30 Days
          </h2>
          <span className="chip ml-1"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)', fontSize: 11 }}>
            {total} mothers
          </span>
        </div>
        <button
          onClick={() => setActivePage('delivery')}
          className="flex items-center gap-1 text-[12px] font-semibold"
          style={{ color: '#60A5FA' }}>
          Full View <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-6 pt-5 pb-6">

        {/* Week summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
          {weeks.map(({ label, count, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: `${color}09`, border: `1px solid ${color}22` }}>
              <div className="text-[18px] font-bold leading-none" style={{ color }}>
                {count}
              </div>
              <div className="text-[10px] font-semibold mt-1 uppercase tracking-wider"
                style={{ color: 'var(--ccmc-text-hint)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart timeline */}
        <div className="relative">

          {/* Y-axis grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none"
            style={{ paddingBottom: 36 }}>
            {[1, 0.75, 0.5, 0.25, 0].map(f => (
              <div key={f} className="w-full flex items-center gap-2">
                <span className="text-[9px] w-5 text-right flex-shrink-0"
                  style={{ color: 'var(--ccmc-text-hint)' }}>
                  {f > 0 ? Math.round(maxCount * f) : ''}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--ccmc-border)', opacity: 0.5 }} />
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-0.5 pl-7" style={{ height: 160, paddingBottom: 0 }}>
            {timeline.map((d, i) => {
              const barH = maxCount > 0 ? Math.max((d.count / maxCount) * 100, d.count > 0 ? 4 : 0) : 0;
              const isHovered = hovered === i;

              // Color by urgency
              const barColor = d.day === 0 ? '#EF4444'
                : d.day <= 7  ? '#F97316'
                : d.day <= 14 ? '#A78BFA'
                : d.day <= 21 ? '#60A5FA'
                : '#22C55E';

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end relative"
                  style={{ height: '100%', cursor: d.count > 0 ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Tooltip */}
                  {isHovered && d.count > 0 && (
                    <div
                      className="absolute z-20 rounded-xl px-3 py-2 text-center pointer-events-none"
                      style={{
                        bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        marginBottom: 8,
                        background: 'var(--ccmc-surface2)',
                        border: `1px solid ${barColor}40`,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        minWidth: 90,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div className="text-[13px] font-bold" style={{ color: barColor }}>{d.count}</div>
                      <div className="text-[10px] font-semibold" style={{ color: 'var(--ccmc-text)' }}>
                        {d.weekday}, {d.date}
                      </div>
                      {d.critical > 0 && (
                        <div className="text-[9px] mt-0.5" style={{ color: '#EF4444' }}>
                          {d.critical} critical
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bar */}
                  {d.count > 0 && (
                    <div
                      className="w-full rounded-t-sm transition-all duration-150"
                      style={{
                        height: `${barH}%`,
                        background: isHovered
                          ? barColor
                          : `linear-gradient(180deg, ${barColor} 0%, ${barColor}88 100%)`,
                        opacity: isHovered ? 1 : 0.75,
                        minHeight: 3,
                        transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis date labels */}
          <div className="flex items-start gap-0.5 pl-7 mt-1.5">
            {timeline.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                {showLabel(i) && (
                  <span className="text-[8px] font-medium leading-tight block"
                    style={{ color: i === 0 ? '#EF4444' : 'var(--ccmc-text-hint)' }}>
                    {i === 0 ? 'Today' : d.date.split(' ')[0]}
                    <br />
                    <span style={{ opacity: 0.6 }}>{d.date.split(' ')[1]}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 pt-4"
          style={{ borderTop: '1px solid var(--ccmc-border)' }}>
          {[
            { label: 'Today',  color: '#EF4444' },
            { label: '≤7 Days', color: '#F97316' },
            { label: 'Week 2', color: '#A78BFA' },
            { label: 'Week 3', color: '#60A5FA' },
            { label: 'Week 4+',color: '#22C55E' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: 0.85 }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
