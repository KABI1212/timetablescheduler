/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neonCyan: '#00f3ff',
                neonPink: '#ff003c',
                neonPurple: '#b026ff',
                cyberBlack: '#0a0a0c',
                cyberGray: '#1a1a1f'
            },
            boxShadow: {
                'neon-cyan': '0 0 10px #00f3ff, 0 0 20px #00f3ff',
                'neon-pink': '0 0 10px #ff003c, 0 0 20px #ff003c',
                'neon-purple': '0 0 10px #b026ff, 0 0 20px #b026ff',
            }
        },
    },
    plugins: [],
}
