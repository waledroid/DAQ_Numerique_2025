/* Shared Tailwind CDN theme — loaded AFTER the Tailwind CDN script on every page.
   Exposes the EDGE VISION design tokens as utilities (bg-ink, text-accent, font-display, …). */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: '#050607',
        surface: '#0B0D10',
        surface2: '#12151A',
        line: 'rgba(255,255,255,0.08)',
        mist: '#F2F4F7',
        muted: '#98A2AE',
        accent: '#34D3A6',
        volt: '#4BE0B8',      // kept as a lighter accent tint (legacy class name)
        emerald: '#2FBF97',   // darker accent tint (legacy class name)
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
