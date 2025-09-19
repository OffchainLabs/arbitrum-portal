/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Portal specific components
    './app/**/*.{js,ts,jsx,tsx}',
    './common/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // Page/Layout
    '../app/src/app/(with-sidebar)/(portal)/**/*.{js,ts,jsx,tsx}',
    // Cobalt
    '../../node_modules/@offchainlabs/cobalt/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [require('@headlessui/tailwindcss')],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      maxWidth: {
        site: '1440px',
      },
      aspectRatio: {
        '3/1': '3 / 1',
      },
      fontFamily: {
        unica77: ['var(--font-unica77)'],
        theme: ['var(--font-family, var(--font-unica77), Roboto, sans-serif)'],
      },
      colors: {
        'default-black': '#1a1c1d',
        'default-black-hover': '#2b2e30',
        'darker-blue': '#2c374b',
        'dark-blue': '#313852',
        'dark-cyan': '#11365E',
        'dark-lime': '#31572A',
        'arb-one-blue': '#1B4ADD',
        'table-dark': '#181818',
        'table-dark-hover': '#222222',
        blue: '#12aaff',
        'ocl-blue': '#243145',
        'link-blue': '#1366c1',
        'sky-blue': '#edf7ff',
        cyan: '#DDEAFA',
        'off-white': '#fbfbfb',
        'one-blue': '#1b4add',
        'nova-orange': '#e57310',
        orange: '#FFEED3',
        'dark-orange': '#60461F',
        'dark-gray': '#6d6d6d',
        'atmosphere-blue': '#152C4E',
        'atmosphere-blue-light': '#8594B4',
        'future-orchid': '#C710FF',
        'future-orchid-dark': '#850BAA',
        'gray-subtext': '#808080',
        'arb-arcade': '#ba2d26',
        'stylus-pink': '#F62674',
        gray: {
          50: '#f4f4f4',
          100: '#e5e5e5',
          200: '#dadada',
          400: '#cccccc',
          500: '#aeaeae',
          600: '#999999',
          700: '#6c757d',
          750: '#6d6d6d',
        },
      },
      boxShadow: {
        tooltip:
          '0px 4px 4px rgba(0, 0, 0, 0.25), 0px 4px 6px rgba(33, 37, 41, 0.2)',
        logo: '0px 0px 20px rgba(255, 255, 255, 0.7)',
        card: '-1px 3px 12px 1px rgb(101 183 255 / 20%)',
        field:
          '0px 2px 2px rgba(33, 37, 41, 0.06), 0px 0px 1px rgba(33, 37, 41, 0.08)',
      },
      borderRadius: {
        md: '5px',
        lg: '10px',
      },
      backgroundImage: {
        'blue-gradient':
          'linear-gradient(0deg, #00e5ff 0, #12aaff 0, #00e5ff 100%)',
        'banner-gradient':
          'linear-gradient(90deg, rgba(40, 160, 240, 0.5) 1.46%, rgba(239, 130, 32, 0.5) 98.51%)',
        'celebration-gradient':
          'linear-gradient(to right, #1B4ADD6F, #E573106F)',
      },
      backgroundSize: {
        '1/2': '50%',
      },
    },
  },
};
