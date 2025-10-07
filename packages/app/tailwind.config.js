/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Portal specific components
    '../portal/app/**/*.{js,ts,jsx,tsx}',
    '../portal/common/**/*.{js,ts,jsx,tsx}',
    '../portal/components/**/*.{js,ts,jsx,tsx}',

    // Page/Layout
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/app/not-found.tsx',
    './src/app/layout.tsx',
    './src/app/(with-sidebar)/layout.tsx',
    './src/app/restricted/page.tsx',
    // Portal Page/Layout
    './src/app/(with-sidebar)/(portal)/**/*.{js,ts,jsx,tsx}',
    // Bridge UI Page/Layout
    '../arb-token-bridge-ui/src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/(embed)/**/*.{js,ts,jsx,tsx}',
    './src/app/(with-sidebar)/bridge/**/*.{js,ts,jsx,tsx}',

    // Cobalt
    '../../node_modules/@offchainlabs/cobalt/**/*.{js,ts,jsx,tsx}',
    // Common components
    '../arb-token-bridge-ui/src/components/common/SiteBanner.tsx',
  ],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('@headlessui/tailwindcss')],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      aspectRatio: {
        '3/1': '3 / 1',
      },
      backgroundImage: {
        'gradient':
          'linear-gradient(90deg, rgba(40, 160, 240, 0.5) 1.46%, rgba(239, 130, 32, 0.5) 98.51%)',
        'gradientCelebration': 'linear-gradient(to right, #1B4ADD6F, #E573106F)',
        'highlight':
          'linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.1) 75%, rgba(255, 255, 255, 0))',
        'eclipse': 'radial-gradient(ellipse 550px 200px at center, #262626 70%, transparent 70%)',
        'eclipseWidget':
          'radial-gradient(ellipse 550px 200px at center, var(--color-widget-background, #191919) 70%, transparent 70%)',
        'blue-gradient': 'linear-gradient(0deg, #00e5ff 0, #12aaff 0, #00e5ff 100%)',
        'banner-gradient':
          'linear-gradient(90deg, rgba(40, 160, 240, 0.5) 1.46%, rgba(239, 130, 32, 0.5) 98.51%)',
        'celebration-gradient': 'linear-gradient(to right, #1B4ADD6F, #E573106F)',
      },
      backgroundSize: {
        '1/2': '50%',
      },
      colors: {
        // ACTION
        'error': '#CD0000',
        'blue-link': '#1366C1',
        'link-blue': '#1366c1',

        // PRIMARY
        'cyan': '#DDEAFA',
        'brick': '#ff9f8b',
        'orange': '#FFEED3',
        'lime': '#E8FFE4',
        'lavender': '#7693EB',
        'bright-blue': '#00FBFF',
        'blue': '#12aaff',

        // SECONDARY
        'cyan-dark': '#11365E',
        'brick-dark': '#762716',
        'orange-dark': '#60461F',
        'lime-dark': '#31572A',

        // TRANSACTION STATUS COLORS
        'claim': '#94d08e',
        'retry': '#CD0000',
        'pending': '#CCB069',

        'default-black-hover': '#2b2e30',
        'darker-blue': '#2c374b',
        'dark-blue': '#313852',
        'dark-cyan': '#11365E',
        'dark-lime': '#31572A',
        'arb-one-blue': '#1B4ADD',
        'table-dark': '#181818',
        'table-dark-hover': '#222222',
        'sky-blue': '#edf7ff',
        'cyan': '#DDEAFA',
        'off-white': '#fbfbfb',
        'one-blue': '#1b4add',
        'nova-orange': '#e57310',
        'orange': '#FFEED3',
        'dark-orange': '#60461F',
        'atmosphere-blue': '#152C4E',
        'atmosphere-blue-light': '#8594B4',
        'future-orchid': '#C710FF',
        'future-orchid-dark': '#850BAA',
        'gray-subtext': '#808080',
        'arb-arcade': '#ba2d26',
        'stylus-pink': '#F62674',

        // NEUTRAL (GRAYS)
        'gray-1': '#191919',
        'gray-2': '#E5E5E5',
        'gray-3': '#DADADA',
        'gray-4': '#CCCCCC',
        'gray-5': '#AEAEAE',
        'gray-6': '#999999',
        'gray-7': '#BDBDBD',
        'gray-8': '#262626',
        'gray': {
          50: '#f4f4f4',
          100: '#e5e5e5',
          200: '#dadada',
          400: '#cccccc',
          500: '#aeaeae',
          600: '#999999',
          700: '#6c757d',
          750: '#6d6d6d',
        },
        'gray-dark': '#6D6D6D',
        'dark-gray': '#6d6d6d',
        'line-gray': '#F4F4F4',
        'gray-9': '#212121',
        'dark': '#1A1C1D', // (or default-black)
        'default-black': '#1a1c1d',
        'dark-hover': '#2b2e30', // (or default-black-hover)

        // BRAND
        'eth-dark': '#1A1C33',
        'ocl-blue': '#243145',
        'atmosphere-blue': '#152C4E',
        'widget-background': 'var(--color-widget-background, #191919)',
        'primary-cta': 'var(--color-primary-cta, #325EE6)',
      },
      fontFamily: {
        unica77: ['var(--font-unica77)'],
        theme: ['var(--font-family, var(--font-unica77), Roboto, sans-serif)'],
      },
      fontSize: {
        xl: '1.375rem',
      },
      lineHeight: {
        'extra-tight': '1.15',
      },
      maxWidth: {
        2: '0.5rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius, 10px)',
        sm: 'calc(var(--border-radius, 10px) / 2)',
        md: 'calc(var(--border-radius, 10px))',
        lg: 'calc(var(--border-radius, 10px) * 3 / 2)',
      },
      borderWidth: {
        DEFAULT: 'var(--border-width, 1px)',
      },
      boxShadow: {
        // shadow used for input fields across the app
        input: '0px 2px 2px rgba(33,37,41,0.06), 0px 0px 1px rgba(33,37,41,0.08)',
        2: '0px 0px 1px 0px rgba(33, 37, 41, 0.08), 0px 2px 2px 0px rgba(33, 37, 41, 0.06)',
        tooltip: '0px 4px 4px rgba(0, 0, 0, 0.25), 0px 4px 6px rgba(33, 37, 41, 0.2)',
        logo: '0px 0px 20px rgba(255, 255, 255, 0.7)',
        card: '-1px 3px 12px 1px rgb(101 183 255 / 20%)',
        field: '0px 2px 2px rgba(33, 37, 41, 0.06), 0px 0px 1px rgba(33, 37, 41, 0.08)',
      },
      keyframes: {
        'blink-pulse': {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.5,
          },
        },
      },
      animation: {
        blink: 'blink-pulse 1s ease-in-out 1',
        blinkInfinite: 'blink-pulse 1s ease-in-out infinite',
      },
      transitionDuration: {
        400: '400ms',
        1000: '1000ms',
      },
    },
  },
};
