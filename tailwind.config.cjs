module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#07111f',
        charcoal: '#111827',
        accent: '#f97316',
        accentSoft: '#fb923c',
        panel: '#0f172a',
        borderGlow: 'rgba(249, 115, 22, 0.35)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(249,115,22,0.22), 0 20px 45px rgba(15,23,42,0.7)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
