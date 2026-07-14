/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark govt theme
        bg:       '#020617',
        panel:    '#0F172A',
        surface:  '#1E293B',
        border:   '#1E3A5F',
        accent1:  '#0F4C81',
        accent2:  '#1976D2',
        accent3:  '#42A5F5',
        textprimary:   '#F1F5F9',
        textsecondary: '#94A3B8',
        texthint:      '#475569',
        // Status
        critical: '#EF4444',
        veryhigh: '#F97316',
        high:     '#EAB308',
        moderate: '#3B82F6',
        low:      '#22C55E',
        success:  '#16A34A',
        warning:  '#F59E0B',
        danger:   '#DC2626',
        info:     '#0EA5E9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        glow:  '0 0 20px rgba(66, 165, 245, 0.15)',
        card:  '0 4px 16px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'govt-gradient': 'linear-gradient(135deg, #0F4C81 0%, #1976D2 50%, #42A5F5 100%)',
        'panel-gradient':'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      },
    },
  },
  plugins: [],
}
