"use client";

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
  height = 266,
  className = "",
  fallbackSrc = "/images/blog/blog_1.png",
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setImgSrc(fallbackSrc)}
      loading="lazy"
    />
  );
};

export default BlogImageWithFallback;
