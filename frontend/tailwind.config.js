/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#F4C430',
                primaryGlow: '#38D9FF',
                accent: '#FFF6D8',
                bgDark: '#050505',
                bgCard: '#111111',
                borderGlow: '#F4C43055',
                textPrimary: '#FFFFFF',
                textSecondary: '#F1E3A4',
                success: '#2AD66B',
                warning: '#F4C430',
                danger: '#FF4D4D',
                labTeal: '#38D9FF'
            },
            boxShadow: {
                'blue-glow': '0 0 30px rgba(244, 196, 48, 0.18)',
                'blue-glow-strong': '0 0 18px rgba(244, 196, 48, 0.55)',
                'success-glow': '0 0 18px rgba(42, 214, 107, 0.35)',
                'warning-glow': '0 0 18px rgba(244, 196, 48, 0.35)',
                'danger-glow': '0 0 18px rgba(255, 77, 77, 0.35)'
            },
            fontFamily: {
                body: ['Manrope', 'system-ui', 'sans-serif'],
                heading: ['Orbitron', 'Manrope', 'sans-serif']
            }
        },
    },
    plugins: [],
}
