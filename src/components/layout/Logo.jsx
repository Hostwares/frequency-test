import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = "default" }) {
  const sizes = {
    small: "h-8",
    default: "h-10",
    large: "h-14"
  };

  return (
    <Link to="/" className="flex items-center gap-3 group">
      <img 
        src="https://media.base44.com/images/public/user_68db51f77646d66a702f8069/18fa267e7_ChatGPTImageJun20202601_29_50PM.png"
        alt="The Mainstream Frequency"
        className={`${sizes[size]} w-auto`}
      />
    </Link>
  );
}