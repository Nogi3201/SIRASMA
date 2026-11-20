import React from 'react';

/** SIRASMA brand mark (same artwork as /favicon.svg). */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'size-9' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs><linearGradient id="sirasma-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3f64b5" /><stop offset="1" stopColor="#17243a" /></linearGradient></defs>
    <rect width="64" height="64" rx="16" fill="url(#sirasma-logo)" />
    <path d="M12 30 32 13l20 17v21a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2Z" fill="#fff" />
    <rect x="25" y="34" width="14" height="19" rx="2" fill="#f15a24" />
    <circle cx="32" cy="26" r="3.2" fill="#203b78" />
  </svg>
);
