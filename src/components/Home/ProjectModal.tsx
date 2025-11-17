"use client";
import React, { useEffect, useRef, useState } from "react";
import Modal from "@/components/Common/Modal";
import { useI18n } from "@/i18n/I18nProvider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

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
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // تحديث التقدّم
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [videoRef.current]);

  // عند الفتح
  useEffect(() => {
    if (!open) return;
    setMuted(true);
    setIsPlaying(false);
    setProgress(0);
  }, [open]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => console.warn("Cannot play:", err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);
    const video = videoRef.current;
    if (video && video.duration) {
      video.currentTime = (newProgress / 100) * video.duration;
    }
  };

  if (!project) return null;

  // دالة لتحويل روابط يوتيوب إلى embed
  const getYouTubeEmbed = (url: string) => {
    if (url.includes("youtube.com/shorts/")) {
      return url.replace("youtube.com/shorts/", "www.youtube.com/embed/");
    } else if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    } else if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return url;
  };

  const isYouTube = project.video?.includes("youtube.com") || project.video?.includes("youtu.be");

  return (
    <Modal
      open={open}
      title={project.title || t("youngStars.projectTitle")}
      onClose={onClose}
    >
      <div className="space-y-5">

        {/* Student Name with Icon */}
        {project.student && (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-darklight rounded-xl p-3 shadow-inner">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-primary"
            >
              <path
                d="M23.3 8.40007L21.82 6.40008C21.7248 6.27314 21.6009 6.17066 21.4583 6.10111C21.3157 6.03156 21.1586 5.99693 21 6.00008H11.2C11.0556 6.00007 10.9128 6.03135 10.7816 6.09177C10.6504 6.15219 10.5339 6.24031 10.44 6.35007L8.72 8.35008C8.57229 8.53401 8.49437 8.76424 8.5 9.00008V16.2901C8.50264 18.0317 9.19568 19.7013 10.4272 20.9328C11.6588 22.1644 13.3283 22.8574 15.07 22.8601H16.93C18.6717 22.8574 20.3412 22.1644 21.5728 20.9328C22.8043 19.7013 23.4974 18.0317 23.5 16.2901V9.00008C23.5 8.7837 23.4298 8.57317 23.3 8.40007Z"
                fill="#FFCC80"
              />
              <path
                d="M29.78 28.38L25.78 23.38C25.664 23.2321 25.5087 23.1198 25.3318 23.0562C25.1549 22.9925 24.9637 22.98 24.78 23.02L16 25L7.22 23C7.03633 22.96 6.84509 22.9725 6.66822 23.0362C6.49134 23.0998 6.336 23.2121 6.22 23.36L2.22 28.36C2.10393 28.5064 2.03117 28.6823 2.00996 28.8679C1.98875 29.0534 2.01994 29.2413 2.1 29.41C2.17816 29.5839 2.30441 29.7319 2.46387 29.8364C2.62333 29.9409 2.80935 29.9977 3 30H29C29.1885 29.9995 29.373 29.9457 29.5322 29.8448C29.6915 29.744 29.819 29.6002 29.9 29.43C29.9801 29.2613 30.0112 29.0734 29.99 28.8879C29.9688 28.7023 29.8961 28.5264 29.78 28.38Z"
                fill="#8c52ff"
              />
            </svg>
            <span className="font-medium text-MidnightNavyText dark:text-white">
              {t("youngStars.TypeName")} {project.student.name || "Student"}
            </span>
          </div>
        )}

        {/* Media Section */}
        {project.video ? (
          isYouTube ? (
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black">
              <iframe
                src={getYouTubeEmbed(project.video)}
                title={project.title || "Project Video"}
                className="w-full h-[60vh] rounded-2xl"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black">
              <video
                ref={videoRef}
                src={project.video}
                loop
                playsInline
                muted={muted}
                className="w-full max-h-[60vh] object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Custom Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 flex flex-col gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={handleProgressChange}
                  onMouseDown={() => videoRef.current?.pause()}
                  onMouseUp={() => videoRef.current?.play()}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between items-center text-white">
                  <button
                    onClick={handlePlayPause}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/40 px-4 py-2 rounded-xl transition-all"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-5 h-5" />
                        <span>{t("youngStars.Pause")}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        <span>{t("youngStars.Play")}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleMute}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/40 px-4 py-2 rounded-xl transition-all"
                  >
                    {muted ? (
                      <>
                        <VolumeX className="w-5 h-5" />
                        <span>{t("youngStars.Unmute")}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />
                        <span>{t("youngStars.Mute")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        ) : project.image ? (
          <div className="rounded-2xl overflow-hidden max-h-80 shadow-lg">
            <img
              src={project.image}
              alt={project.title || "Project image"}
              className="w-full object-cover"
            />
          </div>
        ) : (
          <div className="text-SlateBlueText italic text-center py-10">
            {t("youngStars.noMedia")}
          </div>
        )}

        {/* Description Section */}
        {(project.description || project.portfolioLink) && (
          <div className="text-SlateBlueText leading-relaxed space-y-4">
            {/* {project.description && (
              <p className="text-base dark:text-gray-300">{project.description}</p>
            )} */}
            {project.portfolioLink && (
              <div>
                <a
                  href={project.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/70 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  {t("youngStars.viewPortfolio")}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
