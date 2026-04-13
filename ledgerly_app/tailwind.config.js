module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arctic: {
          50:  "#f0f8ff",
          100: "#dff0fb",
          200: "#b8d9f2",
          300: "#7db8e0",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#060e1e",
        },
        ice: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        frost: {
          50:  "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
      },
      backgroundImage: {
        "arctic-night":  "linear-gradient(160deg, #050d1a 0%, #0b1e3d 50%, #071528 100%)",
        "arctic-dawn":   "linear-gradient(160deg, #dff0fb 0%, #f0f8ff 50%, #e6f4fa 100%)",
        "aurora":        "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 50%, #34d399 100%)",
      },
    },
  },
  plugins: [],
  safelist: [
    {
      pattern: /border-(red|green|blue|yellow|gray|sky|cyan|teal|arctic|ice|frost)-(100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /text-(red|green|blue|yellow|gray|sky|cyan|teal|arctic|ice|frost)-(100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /bg-(sky|cyan|teal|arctic|ice|frost)-(50|100|200|300|400|500|600|700|800|900)/,
    },
  ],
};