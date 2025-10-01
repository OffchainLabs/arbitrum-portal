import React from 'react';

export const Body = ({ children }: { children: React.ReactNode }) => {
  return <div className="relative z-[5] min-h-[calc(100vh-434px)] py-12">{children}</div>;
};
