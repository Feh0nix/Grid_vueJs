/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Google Sheets inspired palette
        primary: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#1a73e8',
          600: '#1967d2',
          700: '#185abc',
          800: '#174ea6',
          900: '#1a73e8',
        },
        success: {
          500: '#188038',
          600: '#137333',
        },
        warning: {
          500: '#f9ab00',
        },
        danger: {
          500: '#d93025',
          600: '#c5221f',
        },
        // Light theme backgrounds
        'gs-bg': {
          primary: '#ffffff',
          secondary: '#f8f9fa',
          tertiary: '#f1f3f4',
        },
        // Dark theme backgrounds
        'gs-dark': {
          bg: '#1e1e1e',
          surface: '#2d2d2d',
          elevated: '#3c4043',
        },
        // Light theme text
        'gs-text': {
          primary: '#202124',
          secondary: '#5f6368',
          tertiary: '#80868b',
          disabled: '#bdc1c6',
        },
        // Dark theme text
        'gs-dark-text': {
          primary: '#e8eaed',
          secondary: '#9aa0a6',
          tertiary: '#80868b',
        },
        // Borders
        'gs-border': {
          light: '#dadce0',
          DEFAULT: '#e8eaed',
          dark: '#3c4043',
        },
        // Selection
        'gs-selection': {
          light: '#e8f0fe',
          dark: '#174ea6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['11px', '14px'],
        'sm': ['12px', '16px'],
        'base': ['13px', '18px'],
        'lg': ['14px', '20px'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'gs': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
        'gs-lg': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15)',
        'dropdown': '0 4px 8px 3px rgba(60, 64, 67, 0.15)',
      },
      borderRadius: {
        'gs': '4px',
        'gs-lg': '8px',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
      transitionTimingFunction: {
        'gs': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar'),
  ],
}
