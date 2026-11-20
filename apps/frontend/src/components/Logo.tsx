import React from 'react';

/** SIRASMA brand mark (hexagon logo, same artwork as the favicon). */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'size-9' }) => (
  <img src="/logo.png" alt="" aria-hidden="true" draggable={false} className={`${className} object-contain`} />
);
