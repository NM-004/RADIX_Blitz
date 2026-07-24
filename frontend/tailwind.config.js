/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        radix: {
          dark: '#0B0F19',
          card: '#161F30',
          border: '#243249',
          primary: '#3B82F6',
          secondary: '#6366F1',
          accent: '#A855F7',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          cyan: '#06B6D4'
        }
      },
      backgroundImage: {
        'radix-gradient': 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), rgba(11, 15, 25, 0))',
        'glass-gradient': 'linear-gradient(135deg, rgba(22, 31, 48, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(59, 130, 246, 0.15)',
      }
    },
  },
  plugins: [],
}
