module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
  safelist: [
    {
      pattern: /border-(red|green|blue|yellow|gray)-(100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /text-(red|green|blue|yellow|gray)-(100|200|300|400|500|600|700|800|900)/,
    },
  ],
};