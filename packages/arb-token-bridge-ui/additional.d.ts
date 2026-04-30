declare module '*.svg' {
  import Image from 'next/image';
  const content: Image['src'];
  export default content;
}

// the following list is for ci lint to pass
declare module '*.png' {
  import Image from 'next/image';
  const content: Image['src'];
  export default content;
}

declare module '*.webp' {
  import Image from 'next/image';
  const content: Image['src'];
  export default content;
}

declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'react-loader-spinner' {
  import { FunctionComponent } from 'react';

  export interface BaseProps {
    height?: string | number;
    width?: string | number;
    color?: string;
    ariaLabel?: string;
    wrapperStyle?: { [key: string]: string };
    wrapperClass?: string;
    visible?: boolean;
  }

  interface TailSpinProps extends BaseProps {
    radius?: string | number;
    strokeWidth?: string | number;
  }

  export const TailSpin: FunctionComponent<TailSpinProps>;
}
