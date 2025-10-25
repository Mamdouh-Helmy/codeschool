import React from "react";

export default function EgyptianPoundIcon({ size = 64, color = "currentColor" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Egyptian Pound Coin"
    >
      <g fill="none" fillRule="evenodd">
        <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="2" />
        <path
          d="M20 26c0-5 6-7 12-7s12 2 12 7c0 5-6 7-12 7s-12 2-12 7"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="32"
          y="38"
          fontFamily="Tahoma, Arial, sans-serif"
          fontSize="14"
          textAnchor="middle"
          fill={color}
        >
          ج.م
        </text>
      </g>
    </svg>
  );
}
