// src/components/UI/BlogImageWithFallback.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

interface BlogImageWithFallbackProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
}

const BlogImageWithFallback: React.FC<BlogImageWithFallbackProps> = ({
  src,
  alt,
  width = 1170,
  height = 766,
  className = "",
  fallbackSrc = "/images/blog/blog_1.png",
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      quality={100}
      className={className}
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
};

export default BlogImageWithFallback;