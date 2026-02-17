/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic tenant colors via CSS variables
        primary: 'var(--color-primary, #1a56db)',
        'primary-light': 'var(--color-primary-light, #3b82f6)',
        secondary: 'var(--color-secondary, #1e3a5f)',
        accent: 'var(--color-accent, #f59e0b)',
        surface: 'var(--color-background, #ffffff)',
        'on-surface': 'var(--color-text, #111827)',
      },
    },
  },
  plugins: [],
};
