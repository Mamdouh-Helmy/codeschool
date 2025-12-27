"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Project } from "@/lib/types";

interface ProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
}

const ProjectModal = ({ project, isOpen, onClose, isOwner = false }: ProjectModalProps) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ تنظيف الفيديو عند إغلاق المودال
  useEffect(() => {
    if (!isOpen) {
      setIsVideoPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isOpen]);

  const handleDownload = useCallback(() => {
    if (project.projectType === 'image' && project.content.imageUrl) {
      const link = document.createElement('a');
      link.href = project.content.imageUrl;
      link.download = `${project.title}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [project]);

  const handlePortfolioClick = useCallback(() => {
    if (project.content.portfolioUrl) {
      window.open(project.content.portfolioUrl, '_blank');
    }
  }, [project]);

  // ✅ Memoized video resolver
  const resolvedVideo = useMemo(() => {
    if (project.projectType !== 'video' || !project.content.videoUrl) return null;
    const url = project.content.videoUrl;
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    if (ytMatch) {
      const id = ytMatch[1];
      return { type: 'youtube', embed: `https://www.youtube.com/embed/${id}?autoplay=1&mute=0&loop=1&playlist=${id}&controls=1` } as const;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      const id = vimeoMatch[1];
      return { type: 'vimeo', embed: `https://player.vimeo.com/video/${id}?autoplay=1&muted=0&loop=1` } as const;
    }
    return { type: 'file', src: url } as const;
  }, [project]);

  // ✅ تحسين تشغيل الفيديو
  useEffect(() => {
    if (project.projectType === 'video' && resolvedVideo && resolvedVideo.type === 'file' && isVideoPlaying && videoRef.current) {
      const v = videoRef.current;
      v.muted = true; // ✅ البدء muted لتجنب مشاكل autoplay
      v.loop = true;
      
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // ✅ محاولة unmute بعد التشغيل
            setTimeout(() => {
              if (v) v.muted = false;
            }, 1000);
          })
          .catch((error) => {
            console.error("Video playback failed:", error);
          });
      }
    }
  }, [isVideoPlaying, project, resolvedVideo]);

  // ✅ إغلاق المودال عند الضغط على ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const renderContent = useCallback(() => {
    switch (project.projectType) {
      case 'video':
        return (
          <div className="relative w-full h-96 md:h-[500px]">
            {isVideoPlaying ? (
              resolvedVideo && (resolvedVideo.type === 'file' ? (
                <video
                  ref={videoRef}
                  src={resolvedVideo.src}
                  className="w-full h-full rounded-lg"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              ) : (
                <iframe
                  src={resolvedVideo.embed}
                  className="w-full h-full rounded-lg"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={project.title}
                  loading="lazy"
                />
              ))
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={project.content.videoThumbnail || "/images/projects/default-thumb.jpg"}
                  alt={project.title}
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
                <button
                  onClick={() => setIsVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors duration-200 rounded-lg"
                  aria-label="Play video"
                >
                  <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200">
                    <svg className="w-8 h-8 text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </button>
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="relative w-full h-96 md:h-[500px]">
            <Image
              src={project.content.imageUrl || "/images/projects/default.jpg"}
              alt={project.content.imageAlt || project.title}
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, 800px"
            />
            {isOwner && (
              <button
                onClick={handleDownload}
                className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download</span>
              </button>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="w-full max-h-96 md:max-h-[500px] overflow-y-auto">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap leading-relaxed">
                {project.content.textContent}
              </p>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="w-full h-96 md:h-[500px] flex flex-col items-center justify-center space-y-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white mb-2">
                Portfolio Project
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {project.content.portfolioDescription}
              </p>
              <button
                onClick={handlePortfolioClick}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2 mx-auto"
              >
                <span>View Portfolio</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Content not available</p>
          </div>
        );
    }
  }, [project, isVideoPlaying, resolvedVideo, isOwner, handleDownload, handlePortfolioClick]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 relative">
              <Image
                src={project.studentImage || "/images/students/default.jpg"}
                alt={project.studentName}
                fill
                className="rounded-full object-cover"
                sizes="48px"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                {project.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                by {project.studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {project.description}
            </p>
            
            {/* Technologies */}
            <div className="flex flex-wrap gap-2 mb-4">
              {project.technologies.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  {tech}
                </span>
              ))}
            </div>

            {/* Category */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Category:</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded">
                {project.category}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;