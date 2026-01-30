/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        ring: 'var(--ring)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: 'inherit',
            a: {
              color: 'inherit', // Let components control link color
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            code: {
              color: 'inherit',
              fontWeight: 'inherit',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            // Reset some prose defaults that conflict with chat bubble layout
            maxWidth: 'none',
            p: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            ul: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            ol: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            li: {
              marginTop: '0.1em',
              marginBottom: '0.1em',
            }
          },
        },
      }),
    },
  },
}

