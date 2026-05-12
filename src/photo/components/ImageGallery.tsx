'use client';

import { useEffect, useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  initialIndex?: number;
}

export function ImageGallery({ images, initialIndex = 0 }: ImageGalleryProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(current - 1);
      if (e.key === 'ArrowRight') go(current + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, images.length]);

  function go(idx: number) {
    if (images.length <= 1 || fading) return;
    setFading(true);
    setTimeout(() => {
      setCurrent((idx + images.length) % images.length);
      setFading(false);
    }, 150);
  }

  if (images.length === 0) return null;

  return (
    <div className="w-full select-none">
      <div className="relative group">
        <img
          src={images[current]}
          alt={`${current + 1} / ${images.length}`}
          className={`w-full max-h-[65vh] object-contain rounded-md transition-opacity duration-150 ${
            fading ? 'opacity-0' : 'opacity-100'
          }`}
          draggable={false}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={() => go(current - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-zinc-900 border border-zinc-600 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-400 flex items-center justify-center opacity-75 hover:opacity-100 transition-all duration-150 z-10 shadow-lg"
              aria-label="Imagem anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
            <button
              onClick={() => go(current + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-zinc-900 border border-zinc-600 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-400 flex items-center justify-center opacity-75 hover:opacity-100 transition-all duration-150 z-10 shadow-lg"
              aria-label="Próxima imagem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <>
          <div className="flex justify-center items-center gap-1.5 mt-4">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => go(idx)}
                className={`h-[3px] rounded-full transition-all duration-300 ${
                  idx === current ? 'w-6 bg-white' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                }`}
                aria-label={`Imagem ${idx + 1}`}
              />
            ))}
          </div>
          <p className="text-center font-mono text-xs text-zinc-500 mt-2">
            {current + 1} / {images.length}
          </p>
        </>
      )}
    </div>
  );
}
