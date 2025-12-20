/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#9333ea',
        primaryLight: '#a855f7',
        danger: '#dc2626',
      },
    },
  },
  plugins: [],
  presets: [require('nativewind/preset')],
};
