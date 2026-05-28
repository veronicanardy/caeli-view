/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
                space: {
                    950: '#090b10',
                    900: '#11131a',
                    800: '#191d27',
                    700: '#262b38',
                },
                signal: {
                    cyan: '#54d6d6',
                    mint: '#76e4b5',
                    amber: '#f8c76b',
                    violet: '#a78bfa',
                    coral: '#ff7b72',
                },
            },
            boxShadow: {
                glow: '0 18px 70px rgba(84, 214, 214, 0.12)',
            },
        },
    },
    plugins: [],
};
