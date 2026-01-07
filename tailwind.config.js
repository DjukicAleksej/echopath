/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'serif': ['"DM Serif Display"', 'serif'],
      },
      colors: {
        editorial: {
          100: '#F9F7F4', // Off-white paper
          900: '#1A1A1A', // Soft black
        }
      },
      animation: {
        'subtle-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
