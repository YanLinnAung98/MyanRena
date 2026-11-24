import React, { useEffect, useRef, useState } from 'react';

const LOADING_VIDEO_CANDIDATES = [
  `${import.meta.env.BASE_URL || './'}assets/c4-loading.mp4`,
  '/MyanRena/assets/c4-loading.mp4',
  'https://raw.githubusercontent.com/YanLinnAung98/MyanRena/main/public/assets/c4-loading.mp4',
];

const LOADING_IMAGE_FALLBACK = `${import.meta.env.BASE_URL || './'}assets/c4-loading.jpg`;

export const Connect4LoadingBackdrop: React.FC = () => {
  const [srcIndex, setSrcIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoFailed) return;
    v.muted = true;
    v.play().catch(() => {
      // Autoplay blocked ဖြစ်ပါက silent ignore
    });
  }, [srcIndex, videoFailed]);

  if (videoFailed) {
    return (
      <img
        src={LOADING_IMAGE_FALLBACK}
        alt="Loading Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  return (
    <video
      key={LOADING_VIDEO_CANDIDATES[srcIndex]}
      ref={videoRef}
      src={LOADING_VIDEO_CANDIDATES[srcIndex]}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      onCanPlay={(e) => {
        e.currentTarget.play().catch(() => {});
      }}
      onError={() => {
        if (srcIndex + 1 < LOADING_VIDEO_CANDIDATES.length) {
          setSrcIndex((i) => i + 1);
        } else {
          setVideoFailed(true);
        }
      }}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};
