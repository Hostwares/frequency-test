import React from 'react';

export function QRCodeImage({ text, size = 200, className = '', alt = 'QR code' }) {
  if (!text) return null;
  const params = new URLSearchParams({
    text,
    size: String(size),
    margin: '1',
    ecLevel: 'M',
  });
  const src = `https://quickchart.io/qr?${params.toString()}`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}