/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      gridTemplateColumns: {
        // main layout
        main: '0.4fr 1.7fr;',
      },
    },
  },
  plugins: [],
};
