"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Modal from "@/components/Common/Modal";
import { useI18n } from "@/i18n/I18nProvider";
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

type Project = {
  _id: string;
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  portfolioLink?: string;
  student?: { name?: string; email?: string };
};

export default function ProjectModal({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // ✅ Memoized function لتحويل روابط يوتيوب
  const getYouTubeEmbed = useCallback((url: string) => {
    if (url.includes("youtube.com/shorts/")) {
      return url.replace("youtube.com/shorts/", "www.youtube.com/embed/");
    } else if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    } else if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return url;
  }, []);

  const isYouTube = useMemo(() => {
    return project?.video?.includes("youtube.com") || project?.video?.includes("youtu.be");
  }, [project?.video]);

  // ✅ تحسين progress update مع throttling
  const updateProgress = useCallback(() => {
    if (!videoRef.current || !videoRef.current.duration) return;
    
    const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    
    // ✅ استخدام requestAnimationFrame لتحسين الأداء
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(() => {
      setProgress(currentProgress);
    });
  }, []);

  // ✅ تحسين الـ event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYouTube) return;

    const handleTimeUpdate = () => updateProgress();
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => setIsPlaying(false);
    const handleLoadedData = () => setIsBuffering(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadeddata", handleLoadedData);

    // ✅ استخدام interval للـ progress فقط إذا كان الفيديو مشغلاً
    if (isPlaying && !isYouTube) {
      progressIntervalRef.current = setInterval(updateProgress, 100);
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadeddata", handleLoadedData);
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, isYouTube, updateProgress]);

  // ✅ تنظيف عند فتح/إغلاق المودال
  useEffect(() => {
    if (!open) {
      // إيقاف الفيديو وتنظيف
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      setIsPlaying(false);
      setProgress(0);
      setMuted(true);
      setIsFullscreen(false);
      setIsBuffering(false);
      
      // تنظيف الـ intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [open]);

  // ✅ Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || isYouTube) return;

    if (isPlaying) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Cannot play video:", err);
          setIsPlaying(false);
        });
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isYouTube]);

  const handleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video || isYouTube) return;
    
    video.muted = !muted;
    setMuted(!muted);
  }, [muted, isYouTube]);

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    const video = videoRef.current;
    
    if (video && video.duration) {
      video.currentTime = (newProgress / 100) * video.duration;
      setProgress(newProgress);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const videoContainer = videoRef.current?.parentElement;
    if (!videoContainer) return;

    try {
      if (!document.fullscreenElement) {
        await videoContainer.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  const handleVideoClick = useCallback(() => {
    if (isYouTube) return;
    handlePlayPause();
  }, [handlePlayPause, isYouTube]);

  // ✅ Memoized render functions
  const renderMedia = useMemo(() => {
    if (!project) return null;

    if (project.video && isYouTube) {
      return (
        <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black">
          <iframe
            src={getYouTubeEmbed(project.video)}
            title={project.title || "Project Video"}
            className="w-full h-[60vh] rounded-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }

    if (project.video) {
      return (
        <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black group">
          <video
            ref={videoRef}
            src={project.video}
            loop
            playsInline
            muted={muted}
            className="w-full max-h-[60vh] object-contain cursor-pointer"
            onClick={handleVideoClick}
            preload="metadata"
            poster={project.image}
          />

          {/* Loading Spinner */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Custom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Progress Bar */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={handleProgressChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <div 
                className="absolute bottom-0 left-0 h-2 bg-primary/50 rounded-lg pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/40 px-4 py-2 rounded-xl transition-all backdrop-blur-sm"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <button
                  onClick={handleMute}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/40 px-4 py-2 rounded-xl transition-all backdrop-blur-sm"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                <span className="text-sm font-mono">
                  {videoRef.current && !isNaN(videoRef.current.duration) 
                    ? `${Math.floor(videoRef.current.currentTime / 60)}:${Math.floor(videoRef.current.currentTime % 60).toString().padStart(2, '0')} / ${Math.floor(videoRef.current.duration / 60)}:${Math.floor(videoRef.current.duration % 60).toString().padStart(2, '0')}`
                    : "0:00 / 0:00"
                  }
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/40 px-4 py-2 rounded-xl transition-all backdrop-blur-sm"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (project.image) {
      return (
        <div className="rounded-2xl overflow-hidden max-h-[60vh] shadow-lg">
          <img
            src={project.image}
            alt={project.title || "Project image"}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      );
    }

    return (
      <div className="text-SlateBlueText italic text-center py-10 bg-gray-100 dark:bg-darklight rounded-2xl">
        {t("youngStars.noMedia")}
      </div>
    );
  }, [project, isYouTube, getYouTubeEmbed, muted, isBuffering, progress, handleProgressChange, handleVideoClick, handlePlayPause, handleMute, toggleFullscreen, isFullscreen, isPlaying]);

  if (!project) return null;

  return (
    <Modal
      open={open}
      title={project.title || t("youngStars.projectTitle")}
      onClose={onClose}
      widthClass="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Student Info */}
        {project.student?.name && (
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-darklight rounded-xl p-4 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-MidnightNavyText dark:text-white">
                {project.student.name}
              </h3>
              {project.student.email && (
                <p className="text-sm text-SlateBlueText dark:text-gray-400">
                  {project.student.email}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Media Section */}
        {renderMedia}

        {/* Description & Links */}
        <div className="space-y-4">
          {project.description && (
            <div className="bg-gray-50 dark:bg-darklight rounded-xl p-4">
              <h4 className="font-medium text-MidnightNavyText dark:text-white mb-2">
                {t("youngStars.description")}
              </h4>
              <p className="text-SlateBlueText dark:text-gray-300 leading-relaxed">
                {project.description}
              </p>
            </div>
          )}

          {project.portfolioLink && (
            <div className="flex justify-center">
              <a
                href={project.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/70 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {t("youngStars.viewPortfolio")}
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}