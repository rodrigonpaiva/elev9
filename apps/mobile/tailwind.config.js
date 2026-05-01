/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: "#475569",
        mist: "#e2e8f0",
        panel: "#f8fafc",
        brand: "#0f766e",
        accent: "#f59e0b",
        success: "#15803d",
        danger: "#dc2626",
      },
    },
  },
  plugins: [],
};
