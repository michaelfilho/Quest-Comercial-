/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        quest: {
          orange: '#FF5A00',
          'orange-hover': '#E04F00',
          'orange-light': '#FFF0E8',
          black: '#111111',
          white: '#FFFFFF',
          'gray-light': '#F5F5F5',
          'gray-dark': '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(17, 17, 17, 0.06), 0 1px 2px -1px rgba(17, 17, 17, 0.04)',
        'card-hover': '0 4px 12px -2px rgba(17, 17, 17, 0.10)',
      },
    },
  },
  plugins: [],
};

