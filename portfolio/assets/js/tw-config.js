/* Shared Tailwind CDN theme — loaded AFTER the Tailwind CDN script on every page.
   Exposes the EDGE VISION design tokens as utilities (bg-ink, text-accent, font-display, …). */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: '#08090B',        // page background
        surface: '#0F1115',    // cards / panels
        surface2: '#161A20',   // raised panels
        line: 'rgba(255,255,255,0.08)',
        mist: '#E8EAED',       // primary text
        muted: '#9BA1A8',      // secondary text
        accent: '#A3E635',     // volt-lime primary accent
        volt: '#B4FF39',       // brightest highlight
        emerald: '#34D399',    // secondary green
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        signature: ['ANAPOLINO', 'cursive'],
      },
      maxWidth: { shell: '76rem' },
      keyframes: {
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        scan: 'scan 4s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
};
