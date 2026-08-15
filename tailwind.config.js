/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // './App.{js,jsx,ts,tsx}',
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#045498",
        // primary: "#9333ea",
        screen: "#e2f1f9",
        secondScreen: "#f1f6f9",
        primaryLight: "#045498",
        danger: "#dc2626",
        dropPin: "#ff0000",
        pickPin: "#22ac5c",
      },
    },
  },
  plugins: [],
  presets: [require("nativewind/preset")],
};
