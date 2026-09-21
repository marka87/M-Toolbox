/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Windows 11 Dark Fluent Palette
        fluent: {
          bg: '#0f141c',
          sidebar: '#141b24',
          card: '#182230',
          'card-hover': '#1f2b3c',
          border: '#233246',
          'border-subtle': '#1b2737',
          accent: '#0078d4',
          'accent-hover': '#1084d9',
          'accent-muted': 'rgba(0, 120, 212, 0.15)',
          muted: '#8b9bb4',
          subtext: '#64748b',
          text: '#f1f5f9',
          // Strict Status Colors (Green, Yellow, Red only)
          status: {
            green: '#22c55e',
            'green-bg': 'rgba(34, 197, 94, 0.12)',
            'green-border': 'rgba(34, 197, 94, 0.25)',
            yellow: '#eab308',
            'yellow-bg': 'rgba(234, 179, 8, 0.12)',
            'yellow-border': 'rgba(234, 179, 8, 0.25)',
            red: '#ef4444',
            'red-bg': 'rgba(239, 68, 68, 0.12)',
            'red-border': 'rgba(239, 68, 68, 0.25)',
          }
        }
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        fluent: '0 4px 16px 0 rgba(0, 0, 0, 0.35)',
        'fluent-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        fluent: '8px',
        'fluent-lg': '12px',
      }
    },
  },
  plugins: [],
}

