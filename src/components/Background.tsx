import React, { useRef, useEffect } from 'react';

interface BackgroundProps {
  currentBgIndex: number;
  activeVideo: number;
  backgroundVideos: string[];
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
  backgroundVideos,
}) => {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  // Which bg index is loaded into each element (null = never loaded)
  const loadedA = useRef<number | null>(null);
  const loadedB = useRef<number | null>(null);
  const didInit = useRef(false);
  const indexRef = useRef(currentBgIndex);
  indexRef.current = currentBgIndex;

  // Start the clip after window "load". A <video> in the document delays that
  // event until the file finishes, and the default background is ~6.5 MB.
  useEffect(() => {
    const start = () => {
      if (didInit.current) return;
      didInit.current = true;
      const video = videoARef.current;
      if (!video) return;
      const index = indexRef.current;
      const path = backgroundVideos[index];
      loadedA.current = index;
      loadAndPlay(video, path);
    };

    if (document.readyState === 'complete') {
      start();
      return;
    }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; index is read from a ref
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
        preload="none"
      />
      <video
        ref={videoBRef}
        className={`fixed inset-0 w-full h-full object-cover z-[-2] transition-opacity duration-700 ${activeVideo === 1 ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        loop
        muted
        playsInline
        preload="none"
      />

      {/* Subtle dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-[-1]" />
    </>
  );
};

export default Background;
