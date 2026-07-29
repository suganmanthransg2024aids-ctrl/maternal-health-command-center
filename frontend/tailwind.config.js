/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enterprise government theme — Deep Navy
        bg:       '#07111F',
        panel:    '#0F1B2E',
        surface:  '#132238',
        border:   '#233754',
        accent1:  '#1E40AF',
        accent2:  '#2563EB',
        accent3:  '#3B82F6',
        textprimary:   '#F8FAFC',
        textsecondary: '#CBD5E1',
        texthint:      '#94A3B8',
        // Status
        critical: '#DC2626',
        veryhigh: '#D97706',
        high:     '#CA8A04',
        moderate: '#0EA5E9',
        low:      '#16A34A',
        success:  '#16A34A',
        warning:  '#D97706',
        danger:   '#DC2626',
        info:     '#0EA5E9',
        purple:   '#7C3AED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title':    ['1.75rem', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '700' }],
        'section-title': ['1.25rem', { lineHeight: '1.3',  letterSpacing: '-0.01em', fontWeight: '700' }],
        'card-title':    ['0.9375rem', { lineHeight: '1.3', fontWeight: '700' }],
        'metric':        ['2.25rem', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'label':         ['0.8125rem', { letterSpacing: '0.06em', fontWeight: '600' }],
        'nav':           ['0.9375rem', { fontWeight: '500' }],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        glow:  '0 0 20px rgba(37, 99, 235, 0.15)',
        card:  '0 4px 16px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'govt-gradient': 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
        'panel-gradient':'linear-gradient(180deg, #0F1B2E 0%, #132238 100%)',
      },
    },
  },
  plugins: [],
}
