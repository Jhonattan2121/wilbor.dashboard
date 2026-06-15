'use client';

import { IconX } from '@/components/IconX';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Markdown from '@/components/Markdown';
import PinataEditPostButton from '../../../app/dashboard/PinataEditPostButton';
import { extractImagesFromMarkdown } from './markdownUtils';
import { Media } from './types';

const SKATEHIVE_URL = 'ipfs.skatehive.app/ipfs';

interface MediaItemProps {
  items: Media[];
  isExpanded: boolean;
  onExpand: () => void;
  onContentSizeChange: (isLarge: boolean) => void;
  onTagClick: (tag: string) => void;
  hasLargeContent?: boolean;
  username?: string | null;
  postingKey?: string | null;
  isEditMode?: boolean;
  selectedTag?: string | null;
}

export function MediaItem({
  items,
  isExpanded,
  onExpand,
  onContentSizeChange,
  onTagClick,
  hasLargeContent = false,
  username,
  postingKey,
  isEditMode = false,
  selectedTag = null,
}: MediaItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [updatedThumbnail, setUpdatedThumbnail] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    function onKey(e: KeyboardEvent) {
      // Não fecha o card se o fullscreen ou o editor de post estiverem abertos
      if (
        e.key === 'Escape' &&
        !isFullscreen &&
        !document.querySelector('[data-edit-modal]')
      ) onExpand();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded, isFullscreen, onExpand]);

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

  const lastReportedSize = useRef<boolean | null>(null);
  useEffect(() => {
    if (!items || items.length === 0) return;
    const mainItem = items[0];
    let isLarge = false;
    if (isExpanded && mainItem.hiveMetadata?.body) {
      const imgs = extractImagesFromMarkdown(mainItem.hiveMetadata.body);
      const textLength = mainItem.hiveMetadata.body.length;
      isLarge = imgs.length > 1 || textLength > 300 || (imgs.length > 0 && textLength > 200);
    } else if (isExpanded && mainItem.src?.includes(SKATEHIVE_URL)) {
      isLarge = true;
    }
    if (lastReportedSize.current !== isLarge) {
      lastReportedSize.current = isLarge;
      onContentSizeChange(isLarge);
    }
  }, [isExpanded, items, onContentSizeChange]);

  // Fecha fullscreen com ESC e bloqueia scroll de fundo enquanto aberto
  useEffect(() => {
    if (typeof window === 'undefined' || !isFullscreen) return;

    const onKey = (e: KeyboardEvent) => {
      // Não fecha o fullscreen se o editor de post estiver aberto
      if (e.key === 'Escape' && !document.querySelector('[data-edit-modal]')) {
        setIsFullscreen(false);
      }
    };

    const { body, documentElement } = document;
    const scrollY = window.scrollY;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;
    const prevBodyBackground = body.style.backgroundColor;
    const prevDocBackground = documentElement.style.backgroundColor;
    const prevFullscreenVh = documentElement.style.getPropertyValue('--fullscreen-vh');
    const prevDocOverflow = documentElement.style.overflow;
    const prevDocOverscroll = documentElement.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';
    documentElement.style.backgroundColor = '#000';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.backgroundColor = '#000';

    const setViewportHeightVar = () => {
      const visualHeight = window.visualViewport?.height ?? window.innerHeight;
      documentElement.style.setProperty('--fullscreen-vh', `${Math.round(visualHeight)}px`);
    };
    setViewportHeightVar();

    // iOS/Android: fixa o body para impedir scroll de fundo durante fullscreen
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', setViewportHeightVar);
    window.visualViewport?.addEventListener('resize', setViewportHeightVar);
    window.visualViewport?.addEventListener('scroll', setViewportHeightVar);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', setViewportHeightVar);
      window.visualViewport?.removeEventListener('resize', setViewportHeightVar);
      window.visualViewport?.removeEventListener('scroll', setViewportHeightVar);

      documentElement.style.overflow = prevDocOverflow;
      documentElement.style.overscrollBehavior = prevDocOverscroll;
      documentElement.style.backgroundColor = prevDocBackground;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.backgroundColor = prevBodyBackground;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      if (prevFullscreenVh) {
        documentElement.style.setProperty('--fullscreen-vh', prevFullscreenVh);
      } else {
        documentElement.style.removeProperty('--fullscreen-vh');
      }

      window.scrollTo(0, scrollY);
    };
  }, [isFullscreen]);

  if (!items || items.length === 0) return null;

  const mainItem = items[0];
  const thumbnailUrl = getThumbnailUrl(mainItem);

  // Tag do card compacto, sublinhada quando é o filtro ativo
  const tagChipClass = (tag: string) => clsx(
    'text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black cursor-pointer hover:underline',
    selectedTag === tag && 'underline',
  );

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
                  <span
                    key={tag}
                    className={tagChipClass(tag)}
                    onClick={e => { e.stopPropagation(); onTagClick(tag); }}
                  >
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

  const editButton = mainItem.hiveMetadata && username ? (
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
  ) : null;

  // Sobreposto na miniatura do card compacto
  const editBtn = editButton ? (
    <div
      className="absolute top-2 right-2 edit-post-btn edit-btn-attention"
      onClick={e => e.stopPropagation()}
    >
      {editButton}
    </div>
  ) : null;

  // Inline nos headers do card expandido e do fullscreen
  const editBtnInline = editButton ? (
    <div className="edit-post-btn" onClick={e => e.stopPropagation()}>
      {editButton}
    </div>
  ) : null;

  return (
    <div
      className={clsx(
        'rounded-lg overflow-hidden h-full group transition-colors duration-100',
        !isExpanded && 'bg-black text-white border-t-8 border-l-8 border-r-8 border-b-0 border-black hover:bg-white hover:text-black hover:border-t-white hover:border-l-white hover:border-r-white cursor-pointer',
        isExpanded && 'p-0 sm:p-2',
      )}
      onClick={e => {
        if (!isExpanded && !(e.target as HTMLElement).closest('.edit-post-btn')) onExpand();
      }}
    >
      <div className={clsx(
        'w-full',
        isExpanded ? 'flex flex-col h-auto transition-all duration-300' : 'min-h-[200px]',
      )}>

        {/* Compact card */}
        {!isExpanded && (
          <>
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
                          <span
                            key={tag}
                            className={tagChipClass(tag)}
                            onClick={e => { e.stopPropagation(); onTagClick(tag); }}
                          >
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
                            <span
                              key={tag}
                              className={tagChipClass(tag)}
                              onClick={e => { e.stopPropagation(); onTagClick(tag); }}
                            >
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
          </>
        )}

        {/* Expanded inline content */}
        {isExpanded && (
          <div className="flex flex-col w-full">
            <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="font-mono text-base sm:text-xl font-semibold tracking-tight">
                  {mainItem.title}
                </h2>
                {mainItem.tags && mainItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mainItem.tags.map(tag => (
                      <span
                        key={tag}
                        className={clsx(
                          'font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer hover:underline',
                          selectedTag === tag && 'underline',
                        )}
                        onClick={e => { e.stopPropagation(); onTagClick(tag); }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {isEditMode && editBtnInline}
                {(mainItem.hiveMetadata?.body || updatedThumbnail) && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setIsFullscreen(true);
                    }}
                    className="p-1.5 sm:p-2 bg-transparent border-none shadow-none rounded-full transition-colors flex items-center justify-center focus:outline-none hover:bg-transparent"
                    aria-label="Abrir em tela cheia"
                    title="Abrir em tela cheia"
                  >
                    <Image
                      src="/wilborPhotos/Full-Screen-Icon-Wilbor-site.png"
                      alt="Abrir em tela cheia"
                      width={28}
                      height={28}
                      style={{ display: 'inline-block' }}
                    />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onExpand(); }}
                  className="p-1.5 sm:p-2 bg-transparent border-none shadow-none rounded-full transition-colors flex items-center justify-center focus:outline-none hover:bg-transparent"
                  aria-label="Fechar"
                >
                  <IconX size={35} />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-start w-full px-4 sm:px-8 py-6">
              {mainItem.hiveMetadata?.body ? (
                <Markdown
                  inExpandedCard
                  videoPoster={updatedThumbnail || thumbnailUrl || undefined}
                >
                  {mainItem.hiveMetadata.body}
                </Markdown>
              ) : updatedThumbnail ? (
                <div className="flex justify-center w-full">
                  <img
                    src={updatedThumbnail}
                    alt={mainItem.title || ''}
                    className="max-w-full max-h-[65vh] object-contain rounded-md"
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>

      {/* Modal fullscreen renderizado via Portal fora do card:
          exibe o post completo (título, texto e imagens) em destaque */}
      {mounted && isFullscreen && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex justify-center bg-black/95"
          onClick={() => setIsFullscreen(false)}
          style={{
            height: 'var(--fullscreen-vh, 100svh)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div
            className="relative w-full sm:max-w-3xl h-full sm:py-6 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col h-full bg-white dark:bg-black sm:rounded-lg overflow-hidden">
              <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="font-mono text-base sm:text-xl font-semibold tracking-tight">
                    {mainItem.title}
                  </h2>
                  {mainItem.tags && mainItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mainItem.tags.map(tag => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {isEditMode && editBtnInline}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setIsFullscreen(false);
                    }}
                    className="p-1.5 sm:p-2 bg-transparent border-none shadow-none rounded-full transition-colors flex items-center justify-center focus:outline-none hover:bg-transparent"
                    aria-label="Fechar fullscreen"
                  >
                    <IconX size={35} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="flex flex-col items-start w-full px-4 sm:px-8 py-6">
                  {mainItem.hiveMetadata?.body ? (
                    <Markdown
                      inExpandedCard
                      videoPoster={updatedThumbnail || thumbnailUrl || undefined}
                    >
                      {mainItem.hiveMetadata.body}
                    </Markdown>
                  ) : updatedThumbnail ? (
                    <div className="flex justify-center w-full">
                      <img
                        src={updatedThumbnail}
                        alt={mainItem.title || ''}
                        className="max-w-full object-contain rounded-md"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
