'use client';

import { IconX } from '@/components/IconX';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import PinataEditPostButton from '../../../app/dashboard/PinataEditPostButton';
import { ImageGallery } from './ImageGallery';
import { extractImagesFromMarkdown } from './markdownUtils';
import { Media } from './types';

const SKATEHIVE_URL = 'ipfs.skatehive.app/ipfs';

interface MediaItemProps {
  items: Media[];
  username?: string | null;
  postingKey?: string | null;
  isEditMode?: boolean;
}

export function MediaItem({
  items,
  username,
  postingKey,
  isEditMode = false,
}: MediaItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [updatedThumbnail, setUpdatedThumbnail] = useState<string | null>(null);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
    }, 160);
  }

  useEffect(() => {
    if (!isExpanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  useEffect(() => {
    if (!items || items.length === 0) { setUpdatedThumbnail(null); return; }
    const mainItem = items[0];
    if (!mainItem.hiveMetadata) {
      setUpdatedThumbnail(getThumbnailUrl(mainItem));
      return;
    }
    const { author, permlink } = mainItem.hiveMetadata;
    fetchPostFromHive(author, permlink).then(post => {
      if (post?.json_metadata) {
        try {
          const meta = typeof post.json_metadata === 'string'
            ? JSON.parse(post.json_metadata)
            : post.json_metadata;
          if (meta.image?.[0]) { setUpdatedThumbnail(meta.image[0]); return; }
        } catch {}
      }
      setUpdatedThumbnail(getThumbnailUrl(mainItem));
    }).catch(() => setUpdatedThumbnail(getThumbnailUrl(mainItem)));
  }, [items]);

  if (!items || items.length === 0) return null;

  const mainItem = items[0];
  const images = extractImagesFromMarkdown(mainItem.hiveMetadata?.body || '');
  const thumbnailUrl = getThumbnailUrl(mainItem);

  const videoSrcs: string[] = [];
  if (mainItem.hiveMetadata?.body) {
    const videoRegex = /<video[^>]*src=["']([^"'>]+)["'][^>]*>/g;
    let match;
    while ((match = videoRegex.exec(mainItem.hiveMetadata.body)) !== null) {
      videoSrcs.push(match[1]);
    }
  }

  function getThumbnailUrl(item: Media): string | null {
    try {
      if (item.hiveMetadata) {
        const meta = item.hiveMetadata as any;
        if (meta.json_metadata) {
          try {
            const parsed = typeof meta.json_metadata === 'string'
              ? JSON.parse(meta.json_metadata)
              : meta.json_metadata;
            if (parsed.image?.[0]) return parsed.image[0];
          } catch {}
        }
      }
      const imgs = extractImagesFromMarkdown(item.hiveMetadata?.body || '');
      return imgs[0] ?? item.src;
    } catch {
      return item.src;
    }
  }

  async function fetchPostFromHive(author: string, permlink: string): Promise<any> {
    try {
      const res = await fetch('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_content',
          params: [author, permlink],
          id: 1,
        }),
      });
      return (await res.json())?.result ?? null;
    } catch {
      return null;
    }
  }

  const renderMedia = (media: Media) => {
    if (media.src?.includes(SKATEHIVE_URL)) {
      return (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex flex-col h-full"
        >
          <div className="flex-1 relative">
            <video
              src={media.src}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-300 filter grayscale hover:grayscale-0"
              autoPlay={isHovered}
              loop
              muted
              playsInline
              style={{ backgroundColor: 'black' }}
              onMouseEnter={e => (e.target as HTMLVideoElement).play()}
              onMouseLeave={e => (e.target as HTMLVideoElement).pause()}
            />
          </div>
          {media.title && (
            <div className="bg-black px-4 py-3">
              <p className="text-white text-base font-medium">{media.title}</p>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 relative group">
          <Image
            src={updatedThumbnail || thumbnailUrl || media.src || 'https://placehold.co/600x400?text=No+Image'}
            alt={media.title || ''}
            fill
            className="object-cover transition-all duration-300 filter grayscale group-hover:grayscale-0"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            quality={85}
            unoptimized
            onError={() => {}}
          />
        </div>
        {media.title && (
          <div className="bg-black flex flex-col justify-center items-start px-4 py-6 w-full rounded-b-lg group-hover:bg-white transition-colors duration-100">
            <div className="text-gray-400 text-xl font-bold line-clamp-2 text-left group-hover:text-black transition-colors duration-100">
              {media.title}
            </div>
            {media.tags && media.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                {media.tags.map(tag => (
                  <span key={tag} className="text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const editBtn = mainItem.hiveMetadata && username ? (
    <div
      className="absolute top-2 right-2 edit-post-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      onClick={e => e.stopPropagation()}
    >
      <PinataEditPostButton
        username={username}
        postingKey={postingKey || undefined}
        permlink={mainItem.hiveMetadata.permlink}
        author={mainItem.hiveMetadata.author}
        initialTitle={mainItem.title || ''}
        initialContent={mainItem.hiveMetadata.body || ''}
        initialTags={mainItem.tags || []}
        initialImages={extractImagesFromMarkdown(mainItem.hiveMetadata.body || '')}
        initialThumbnail={updatedThumbnail || thumbnailUrl || undefined}
      />
    </div>
  ) : null;

  return (
    <>
      {/* Compact card */}
      <div
        className="rounded-lg overflow-hidden h-full group transition-colors duration-100 bg-black text-white border-t-8 border-l-8 border-r-8 border-b-0 border-black hover:bg-white hover:text-black hover:border-t-white hover:border-l-white hover:border-r-white cursor-pointer"
        onClick={e => {
          if (!(e.target as HTMLElement).closest('.edit-post-btn')) setIsExpanded(true);
        }}
      >
        <div className="w-full h-full min-h-[200px]">

          {/* Mobile */}
          <div className="sm:hidden w-full">
            {mainItem.hiveMetadata?.body && updatedThumbnail ? (
              <div className="flex flex-col h-full w-full">
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src={updatedThumbnail}
                    alt={mainItem.title || ''}
                    fill
                    className="object-cover filter grayscale group-hover:grayscale-0 rounded-t-lg"
                    sizes="100vw"
                  />
                  {isEditMode && editBtn}
                </div>
                <div className="bg-black flex flex-col justify-center items-start px-4 py-6 w-full rounded-b-lg group-hover:bg-white transition-colors duration-100">
                  <div className="text-gray-400 text-xl font-bold line-clamp-2 text-left group-hover:text-black transition-colors duration-100">
                    {mainItem.title}
                  </div>
                  {mainItem.tags && mainItem.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                      {mainItem.tags.map(tag => (
                        <span key={tag} className="text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 relative group h-full">
                {renderMedia(mainItem)}
              </div>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex flex-row h-full w-full">
            {mainItem.hiveMetadata?.body ? (
              updatedThumbnail ? (
                <div className="flex flex-col h-full w-full">
                  <div className="flex-1 relative group" style={{ minHeight: '200px' }}>
                    <Image
                      src={updatedThumbnail}
                      alt={mainItem.title || ''}
                      fill
                      className="object-cover filter grayscale group-hover:grayscale-0"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      quality={85}
                      unoptimized
                    />
                    {isEditMode && editBtn}
                  </div>
                  <div className="bg-black flex flex-col justify-center px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 group-hover:bg-white transition-colors duration-100">
                    <div className="text-gray-400 text-xs sm:text-sm md:text-base font-medium line-clamp-1 group-hover:text-black transition-colors duration-100">
                      {mainItem.title}
                    </div>
                    {mainItem.tags && mainItem.tags.length > 0 && (
                      <div className={clsx(
                        'flex flex-wrap gap-1 mt-1',
                        showAllTags ? 'max-h-none pb-2' : 'min-h-[24px] max-h-[24px] overflow-hidden',
                      )}>
                        {(showAllTags ? mainItem.tags : mainItem.tags.slice(0, 3)).map(tag => (
                          <span key={tag} className="text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black">
                            {tag}
                          </span>
                        ))}
                        {!showAllTags && mainItem.tags.length > 3 && (
                          <span
                            className="text-xs text-gray-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                            onClick={e => { e.stopPropagation(); setShowAllTags(true); }}
                          >
                            +{mainItem.tags.length - 3}
                          </span>
                        )}
                        {showAllTags && (
                          <span
                            className="text-xs text-gray-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                            onClick={e => { e.stopPropagation(); setShowAllTags(false); }}
                          >
                            Menos
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 relative group h-full">
                  {renderMedia(mainItem)}
                  {isEditMode && editBtn}
                </div>
              )
            ) : (
              <div className="flex-1 relative group h-full">
                {renderMedia(mainItem)}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal */}
      {isExpanded && (
        <div
          className={`fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-start justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="font-mono text-base sm:text-xl font-semibold text-white tracking-tight">
                {mainItem.title}
              </h2>
              {mainItem.tags && mainItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {mainItem.tags.map(tag => (
                    <span key={tag} className="font-mono text-[10px] text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-500 transition-all"
              aria-label="Fechar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
              {videoSrcs.length > 0 && (
                <div className="mb-8 space-y-4">
                  {videoSrcs.map((src, idx) => (
                    <video key={src + idx} src={src} controls className="w-full rounded-lg" />
                  ))}
                </div>
              )}
              {images.length > 0 && <ImageGallery images={images} />}
              {videoSrcs.length === 0 && images.length === 0 && updatedThumbnail && (
                <div className="flex justify-center">
                  <img
                    src={updatedThumbnail}
                    alt={mainItem.title || ''}
                    className="max-w-full max-h-[65vh] object-contain rounded-md"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
