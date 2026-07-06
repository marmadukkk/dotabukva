import React, { useRef, useEffect } from 'react';

interface BackgroundProps {
  currentBgIndex: number;
  activeVideo: number;
  isTransitioning: boolean;
  backgroundVideos: string[];
  onChangeBackground: () => void;
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

  // Handle background changes and crossfade
  useEffect(() => {
    const activeRef = activeVideo === 0 ? videoARef : videoBRef;
    const video = activeRef.current;
    if (video) {
      video.src = backgroundVideos[currentBgIndex];
      video.load();
      video.oncanplay = () => {
        video.play().catch(() => {});
        video.oncanplay = null;
      };
    }
  }, [currentBgIndex, activeVideo, backgroundVideos]);

  return (
    <>
      <video
        ref={videoARef}
        src={activeVideo === 0 ? backgroundVideos[currentBgIndex] : undefined}
        className={`fixed inset-0 w-full h-full object-cover z-[-2] transition-opacity duration-700 ${activeVideo === 0 ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        loop
        muted
        playsInline
      />
      <video
        ref={videoBRef}
        src={activeVideo === 1 ? backgroundVideos[currentBgIndex] : undefined}
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
