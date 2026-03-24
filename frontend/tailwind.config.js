/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#FFB454',
                primaryGlow: '#62E6D7',
                accent: '#FFF4D8',
                bgDark: '#09111F',
                bgCard: '#111B2E',
                borderGlow: '#FFD08A55',
                textPrimary: '#FFFFFF',
                textSecondary: '#C7D2E3',
                success: '#4ADE80',
                warning: '#FBBF24',
                danger: '#FB7185',
                labTeal: '#67E8F9'
            },
            boxShadow: {
                'blue-glow': '0 0 30px rgba(255, 180, 77, 0.18)',
                'blue-glow-strong': '0 0 18px rgba(255, 180, 77, 0.42)',
                'success-glow': '0 0 18px rgba(74, 222, 128, 0.35)',
                'warning-glow': '0 0 18px rgba(251, 191, 36, 0.35)',
                'danger-glow': '0 0 18px rgba(251, 113, 133, 0.35)'
            },
            fontFamily: {
                body: ['Space Grotesk', 'system-ui', 'sans-serif'],
                heading: ['Sora', 'Space Grotesk', 'sans-serif']
            }
        },
    },
    plugins: [],
}
