import { motion, useScroll, useTransform } from 'framer-motion';
import { useWindowSize } from 'react-use';

export const Moon = () => {
  const { width } = useWindowSize();
  const moonScaleRange = width >= 1024 ? [0.75, 1] : [0.75, 1.25];

  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 1], moonScaleRange);

  return (
    <motion.img
      src="/images/moon.webp"
      alt="Moon"
      className="absolute bottom-[-210px] right-0 z-0 md:bottom-[-410px] lg:bottom-[-680px] lg:max-w-[1100px]"
      style={{ scale }}
    />
  );
};
