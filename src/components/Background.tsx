import React, { useRef, useEffect } from 'react';

interface BackgroundProps {
  currentBgIndex: number;
  activeVideo: number;
  isTransitioning: boolean;
  backgroundVideos: string[];
  onChangeBackground: () => void;
}

/** True if the video element is already pointing at the given path (handles absolute currentSrc). */
function videoHasSrc(video: HTMLVideoElement, path: string): boolean {
  if (!path) return false;
  const src = video.currentSrc || video.src || '';
  if (!src) return false;
  return src === path || src.endsWith(path) || src.includes(path);
}

function loadAndPlay(video: HTMLVideoElement, path: string) {
  if (videoHasSrc(video, path) && video.readyState >= 2) {
    if (video.paused) video.play().catch(() => {});
    return;
  }
  video.src = path;
  video.load();
  const play = () => {
    video.play().catch(() => {});
  };
  video.addEventListener('canplay', play, { once: true });
  // If data is already buffered enough, play immediately
  if (video.readyState >= 3) play();
}

const Background: React.FC<BackgroundProps> = ({
  currentBgIndex,
  activeVideo,
  isTransitioning,
  backgroundVideos,
  onChangeBackground,
}) => {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  // Which bg index is loaded into each element (null = never loaded)
  const loadedA = useRef<number | null>(null);
  const loadedB = useRef<number | null>(null);
  const didInit = useRef(false);

  // Initial load once — never re-run on parent re-renders
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const video = videoARef.current;
    if (!video) return;
    const path = backgroundVideos[currentBgIndex];
    loadedA.current = currentBgIndex;
    loadAndPlay(video, path);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init
  }, []);

  // Crossfade: only when the user switches background
  useEffect(() => {
    if (!didInit.current) return;

    const isA = activeVideo === 0;
    const video = (isA ? videoARef : videoBRef).current;
    const loadedRef = isA ? loadedA : loadedB;
    if (!video) return;

    // Already showing this clip on this element — keep playing, do not reload
    if (loadedRef.current === currentBgIndex) {
      if (video.paused) video.play().catch(() => {});
      return;
    }

    const path = backgroundVideos[currentBgIndex];
    loadedRef.current = currentBgIndex;
    loadAndPlay(video, path);
  }, [currentBgIndex, activeVideo, backgroundVideos]);

  return (
    <>
      {/* src is managed imperatively so React re-renders never reset the video */}
      <video
        ref={videoARef}
        className={`fixed inset-0 w-full h-full object-cover z-[-2] transition-opacity duration-700 ${activeVideo === 0 ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        loop
        muted
        playsInline
      />
      <video
        ref={videoBRef}
        className={`fixed inset-0 w-full h-full object-cover z-[-2] transition-opacity duration-700 ${activeVideo === 1 ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Subtle dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-[-1]" />

      {/* Background change button */}
      <button
        onClick={onChangeBackground}
        disabled={isTransitioning}
        className="fixed bottom-4 right-4 z-[95] w-9 h-9 bg-black/70 hover:bg-black/90 text-[#d4af37] border border-[#444] hover:border-[#d4af37] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-50"
        title="Сменить фон"
      >
        <i className="fa-solid fa-sync text-base"></i>
      </button>
    </>
  );
};

export default Background;
