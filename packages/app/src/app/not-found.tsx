import Image from 'next/image';

import FixingSpaceship from '@/images/arbinaut-fixing-spaceship.webp';
import { ArbitrumNavigation } from '../components/ArbitrumNavigation';

export default function NotFound() {
  return (
    <ArbitrumNavigation>
      <div className="flex w-full flex-col items-center space-y-4 px-8 py-4 text-center lg:py-0">
        <span className="text-8xl text-white">404</span>
        <p className="text-3xl text-white">Page not found in this solar system</p>
        <Image src={FixingSpaceship} alt="Arbinaut fixing a spaceship" className="lg:max-w-md" />
      </div>
    </ArbitrumNavigation>
  );
}
