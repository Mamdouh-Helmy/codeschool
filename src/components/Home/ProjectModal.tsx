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

/* ================= Helpers ================= */

const YOUTUBE_ID_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|watch\?v=))([\w-]{11})/;

const getYouTubeId = (url?: string) => url?.match(YOUTUBE_ID_REGEX)?.[1] ?? null;

// iOS مبيعرضش أول فريم من غير الـ fragment ده
const withFirstFrame = (url: string) =>
  url.includes("#") ? url : `${url}#t=0.001`;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

/* ================= Sub components ================= */

const ControlButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 transition-all hover:bg-white/40 sm:px-4"
  >
    {children}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const VideoPlayer = ({ src, poster }: { src: string; poster?: string }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // يبدأ صامت (المتصفحات بتسمح بكده)، والمستخدم يفتح الصوت بإيده
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.play().catch(() => {});
    return () => video.pause();
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const time = (Number(e.target.value) / 100) * duration;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black shadow-lg">
      <video
        ref={videoRef}
        src={withFirstFrame(src)}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        className="max-h-[55vh] w-full cursor-pointer object-contain sm:max-h-[60vh]"
      />

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={t("youngStars.Play")}
          className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-lg transition-transform active:scale-95"
        >
          <Play className="h-7 w-7 translate-x-0.5 fill-current" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-black/50 p-3 backdrop-blur-sm sm:gap-3 sm:p-4">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={seek}
          aria-label="Seek"
          className="w-full cursor-pointer accent-primary"
        />

        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <ControlButton
              label={playing ? t("youngStars.Pause") : t("youngStars.Play")}
              onClick={togglePlay}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </ControlButton>
            <span className="whitespace-nowrap text-xs tabular-nums text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <ControlButton
            label={muted ? t("youngStars.Unmute") : t("youngStars.Mute")}
            onClick={toggleMute}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </ControlButton>
        </div>
      </div>
    </div>
  );
};

const YouTubePlayer = ({
  id,
  title,
  isShort,
}: {
  id: string;
  title: string;
  isShort: boolean;
}) => (
  <div
    className={`relative mx-auto overflow-hidden rounded-2xl bg-black shadow-lg ${
      isShort ? "aspect-[9/16] max-h-[65vh] sm:max-h-[70vh]" : "aspect-video w-full"
    }`}
  >
    <iframe
      src={`https://www.youtube.com/embed/${id}?rel=0&playsinline=1`}
      title={title}
      className="absolute inset-0 h-full w-full"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  </div>
);

const StudentBadge = ({ name }: { name: string }) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 shadow-inner dark:bg-darklight">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 shrink-0 text-primary"
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
      <span className="min-w-0 break-words font-medium text-MidnightNavyText dark:text-white">
        {t("youngStars.TypeName")} {name}
      </span>
    </div>
  );
};

/* ================= Main ================= */

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

  if (!project) return null;

  const title = project.title || t("youngStars.projectTitle");
  const youTubeId = getYouTubeId(project.video);

  const renderMedia = () => {
    if (youTubeId) {
      return (
        <YouTubePlayer
          id={youTubeId}
          title={title}
          isShort={!!project.video?.includes("/shorts/")}
        />
      );
    }

    if (project.video) {
      return <VideoPlayer src={project.video} poster={project.image} />;
    }

    if (project.image) {
      return (
        <div className="max-h-72 overflow-hidden rounded-2xl shadow-lg sm:max-h-80">
          <img src={project.image} alt={title} className="h-full w-full object-cover" />
        </div>
      );
    }

    return (
      <div className="py-10 text-center italic text-SlateBlueText">
        {t("youngStars.noMedia")}
      </div>
    );
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      {/* open && ... : عشان الفيديو واليوتيوب يتشالوا من الصفحة ويقف صوتهم عند الإغلاق */}
      {open && (
        <div className="space-y-4 sm:space-y-5">
          {project.student && (
            <StudentBadge name={project.student.name || "Student"} />
          )}

          {renderMedia()}

          {(project.description || project.portfolioLink) && (
            <div className="space-y-4 leading-relaxed text-SlateBlueText dark:text-gray-300">
              {project.description && (
                <p className="whitespace-pre-line break-words">{project.description}</p>
              )}
              {project.portfolioLink && (
                <a
                  href={project.portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3 font-medium text-white shadow-md transition-all duration-300 hover:shadow-xl sm:w-auto sm:py-2.5 sm:hover:scale-105"
                >
                  {t("youngStars.viewPortfolio")}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}