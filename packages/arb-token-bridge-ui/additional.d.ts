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

// msw only declares its Node entry point in the exports of its package.json, which
// "moduleResolution": "node" doesn't read
declare module 'msw/node' {
  export * from 'msw/lib/node/index';
}
