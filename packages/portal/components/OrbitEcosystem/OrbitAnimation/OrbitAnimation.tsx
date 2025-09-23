'use client';

import { Orbit, Planet, ReactOrbits } from 'react-orbits';
import './orbitAnimation.css';
import { ORBIT_CHAINS } from '@/common/orbitChains';

const getRandomOrbiChainImage = () =>
  ORBIT_CHAINS[Math.floor(Math.random() * (ORBIT_CHAINS.length - 1))].images
    .logoUrl;

const iconsize = 50;

export const OrbitAnimation = () => {
  return (
    <ReactOrbits firstOrbitDiameter={400} marginBetweenOrbits={100}>
      <Orbit
        borderColor="#95abd5"
        degrees={-90}
        animationSpeedInSeconds={2.5 * 10}
      >
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
      </Orbit>

      <Orbit
        borderColor="#95abd5"
        degrees={40}
        animationSpeedInSeconds={2.5 * 12}
      >
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
      </Orbit>

      <Orbit
        borderColor="#95abd5"
        degrees={-70}
        animationSpeedInSeconds={2.5 * 16}
      >
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
      </Orbit>

      <Orbit
        borderColor="#95abd5"
        degrees={70}
        animationSpeedInSeconds={2.5 * 20}
      >
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />

        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
        <Planet
          backgroundImageURL={getRandomOrbiChainImage()}
          shouldSpin={false}
          backgroundColor={'#ffffff50'}
          size={iconsize}
        />
      </Orbit>
    </ReactOrbits>
  );
};
