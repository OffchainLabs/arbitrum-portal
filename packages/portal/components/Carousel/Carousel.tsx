'use client';

import './flickity.css';
import { PropsWithChildren } from 'react';
import Flickity from 'react-flickity-component';

const Carousel = ({
  children,
  prevNextButtons = true,
}: PropsWithChildren<{ prevNextButtons?: boolean }>) => {
  const carouselOptions = {
    draggable: true,
    cellAlign: 'left',
    prevNextButtons,
    wrapAround: true,
    autoPlay: 3000,
    groupCells: true,
    pauseAutoPlayOnHover: true,
    arrowShape:
      'M23.925 56.4284L57.45 90.9103L48.6125 100L-5.1656e-06 50L48.6125 5.0443e-06L57.45 9.08974L23.925 43.5716L100 43.5716L100 56.4284L23.925 56.4284Z',
  };

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute z-10 h-full w-full bg-gradient-to-r from-transparent from-80% to-black/90 lg:hidden" />
      <Flickity options={carouselOptions} static>
        {children}
      </Flickity>
    </div>
  );
};

export default Carousel;
