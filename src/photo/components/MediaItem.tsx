'use client';

import { IconX } from '@/components/IconX';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import EditPostButton from '../../../app/dashboard/EditPostButton';
import { ImageGallery } from './ImageGallery';
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
  isReversedLayout?: boolean;
  username?: string | null;
  postingKey?: string | null;
  isEditMode?: boolean;
}

export function MediaItem({
  items,
  isExpanded,
  onExpand,
  onContentSizeChange,
  onTagClick,
  hasLargeContent = false,
  isReversedLayout = false,
  username,
  postingKey,
  isEditMode = false,
}: MediaItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [updatedThumbnail, setUpdatedThumbnail] = useState<string | null>(null);
  
  // Initialize updatedThumbnail when items change
  useEffect(() => {
    if (items && items.length > 0) {
      const mainItem = items[0];
      const thumbnailUrl = getThumbnailUrl(mainItem);
      setUpdatedThumbnail(thumbnailUrl);
      
      if (mainItem.hiveMetadata) {
        const { author, permlink } = mainItem.hiveMetadata;
        fetchPostFromHive(author, permlink).then(post => {
          if (post && post.json_metadata) {
            try {
              const metadata = typeof post.json_metadata === 'string'
                ? JSON.parse(post.json_metadata)
                : post.json_metadata;
              if (metadata.image && metadata.image.length > 0) {
                setUpdatedThumbnail(metadata.image[0]);
              }
            } catch (e) {
              console.error('Erro ao analisar o JSON metadata:', e);
            }
          }
        });
      }
    }
  }, [items]);
  
  useEffect(() => {
    if (items && items.length > 0) {
      const mainItem = items[0];
      let isLarge = false;
      
      if (isExpanded && mainItem.hiveMetadata?.body) {
        const imageCount = extractImagesFromMarkdown(mainItem.hiveMetadata.body).length;
        const textLength = mainItem.hiveMetadata.body.length;
        isLarge = imageCount > 1 || textLength > 300 || (imageCount > 0 && textLength > 200);
      } else if (isExpanded && mainItem.src?.includes(SKATEHIVE_URL)) {
        isLarge = true;
      }
      
      // Evitar chamadas desnecessárias se o valor não mudar
      if (hasLargeContent !== isLarge) {
        onContentSizeChange(isLarge);
      }
    }
  }, [isExpanded, items, hasLargeContent, onContentSizeChange]);
  
  useEffect(() => {
    setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  
  // Safety check: return early if no items
  if (!items || items.length === 0) {
    return null;
  }
  
  const mainItem = items[0];
  const images = extractImagesFromMarkdown(mainItem.hiveMetadata?.body || '');

  function getThumbnailUrl(item: Media): string | null {
    try {
      if (item.hiveMetadata) {
        const metadata = item.hiveMetadata as any;
        if (metadata.json_metadata) {
          try {
            const parsedMetadata = typeof metadata.json_metadata === 'string'
              ? JSON.parse(metadata.json_metadata)
              : metadata.json_metadata;
            if (parsedMetadata.image && parsedMetadata.image.length > 0) {
              return parsedMetadata.image[0];
            }
          } catch (parseError) {
            console.error('Error parsing JSON metadata:', parseError);
          }
        }
      }
      const images = extractImagesFromMarkdown(item.hiveMetadata?.body || '');
      if (images.length > 0) {
        return images[0];
      }
      return item.src;
    } catch (e) {
      console.error('Error getting thumbnail:', e);
      return item.src;
    }
  }

  async function fetchPostFromHive(author: string, permlink: string): Promise<any> {
    try {
      const response = await fetch('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_content',
          params: [author, permlink],
          id: 1,
        }),
      });
      const data = await response.json();
      if (data && data.result) {
        return data.result;
      }
      return null;
    } catch (error) {
      console.error('Error fetching post data:', error);
      return null;
    }
  }

  const thumbnailUrl = getThumbnailUrl(mainItem);

  const renderMedia = (media: Media, isMainVideo: boolean = false) => {
    if (media.src?.includes(SKATEHIVE_URL)) {
      return (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex flex-col h-full"
        >
          <div className="flex-1 relative" style={isMainVideo ? { paddingTop: '56.25%' } : {}}>
            <video
              src={media.src}
              className={clsx(
                'transition-all duration-300 filter grayscale hover:grayscale-0',
                isMainVideo ? 'absolute top-0 left-0 w-full h-full object-contain' : 'absolute inset-0 w-full h-full object-cover',
              )}
              autoPlay={isHovered || (!isMainVideo && isExpanded)}
              loop={!isMainVideo}
              muted={!isMainVideo}
              controls={isMainVideo}
              playsInline
              style={{ backgroundColor: 'black' }}
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                if (isMainVideo) {
                  video.volume = 0.2;
                }
              }}
              onMouseEnter={(e) => {
                const video = e.target as HTMLVideoElement;
                video.play();
              }}
              onMouseLeave={(e) => {
                const video = e.target as HTMLVideoElement;
                video.pause();
              }}
            />
          </div>
          {!isMainVideo && media.title && (
            <div className="bg-black flex flex-col justify-center px-4 py-3">
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
            unoptimized={true}
            onError={() => {
              setImageError(true);
              if (imageError && media.src) {
                return media.src;
              }
            }}
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
                    className="text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black"
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

  return (
    <div
      className={clsx(
        'rounded-lg overflow-hidden h-full group transition-colors duration-100 bg-black text-white',
        !isExpanded && 'border-t-8 border-l-8 border-r-8 border-b-0 border-black hover:bg-white hover:text-black hover:border-t-white hover:border-l-white hover:border-r-white',
        isExpanded && 'p-2',
      )}
      onClick={e => {
        // Não expandir se estamos clicando no botão Editar
        if (!isExpanded && !(e.target as HTMLElement).closest('.edit-post-btn')) {
          onExpand();
        }
      }}
    >
      <div className={clsx(
        'w-full h-full',
        isExpanded && 'transition-all duration-300',
        isExpanded
          ? hasLargeContent
            ? 'flex flex-col h-auto min-h-[550px] sm:min-h-[600px]'
            : 'flex flex-col h-auto min-h-[200px] sm:min-h-[450px]'
          : 'min-h-[200px]',
      )}>
        {!isExpanded && (
          <>
            <div className="sm:hidden w-full">
              {mainItem.hiveMetadata?.body && updatedThumbnail ? (
                <div className="flex flex-col h-full w-full">
                  <div className="relative w-full aspect-[4/3]">
                    <Image
                      src={updatedThumbnail}
                      alt={mainItem.title || ''}
                      fill
                      className="object-cover filter grayscale group-hover:grayscale-0 rounded-t-lg"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                    />
                    {isEditMode && mainItem.hiveMetadata && username && (
                      <div className="absolute top-2 right-2 edit-post-btn" onClick={e => e.stopPropagation()}>
                        <div className="pointer-events-auto">
                          <EditPostButton
                            username={username}
                            postingKey={postingKey || undefined}
                            permlink={mainItem.hiveMetadata.permlink}
                            author={mainItem.hiveMetadata.author}
                            initialTitle={mainItem.title || ''}
                            initialContent={mainItem.hiveMetadata.body || ''}
                            initialTags={mainItem.tags || []}
                            initialImages={extractImagesFromMarkdown(mainItem.hiveMetadata.body || '')}
                          />
                        </div>
                      </div>
                    )}
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
                            className="text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black"
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
            <div className="hidden sm:flex flex-row h-full w-full">
              {mainItem.hiveMetadata?.body && (
                <>
                  {updatedThumbnail ? (
                    <>
                      <div className="flex flex-row h-full w-full">
                        <div className="hidden sm:flex sm:flex-col h-full w-full">
                          <div className="flex-1 relative group" style={{ minHeight: '200px' }}>
                            <Image
                              src={updatedThumbnail}
                              alt={mainItem.title || ''}
                              fill
                              className="object-cover filter grayscale group-hover:grayscale-0"
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                              quality={85}
                              unoptimized={true}
                            />
                            {isEditMode && mainItem.hiveMetadata && username && (
                              <div className="absolute top-2 right-2 edit-post-btn" onClick={e => e.stopPropagation()}>
                                <div className="pointer-events-auto">
                                  <EditPostButton
                                    username={username}
                                    postingKey={postingKey || undefined}
                                    permlink={mainItem.hiveMetadata.permlink}
                                    author={mainItem.hiveMetadata.author}
                                    initialTitle={mainItem.title || ''}
                                    initialContent={mainItem.hiveMetadata.body || ''}
                                    initialTags={mainItem.tags || []}
                                    initialImages={extractImagesFromMarkdown(mainItem.hiveMetadata.body || '')}
                                  />
                                </div>
                              </div>
                            )}
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
                                    className="text-xs text-gray-400 px-1.5 py-0.5 rounded transition-colors duration-100 group-hover:text-black"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {!showAllTags && mainItem.tags.length > 3 && (
                                  <span
                                    className="text-xs text-gray-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setShowAllTags(true);
                                    }}
                                  >
                                    +{mainItem.tags.length - 3}
                                  </span>
                                )}
                                {showAllTags && (
                                  <span
                                    className="text-xs text-gray-400  px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setShowAllTags(false);
                                    }}
                                  >
                                    Menos
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 relative group h-full">
                      {renderMedia(mainItem)}
                      {isEditMode && mainItem.hiveMetadata && username && (
                        <div className="absolute top-2 right-2 edit-post-btn" onClick={e => e.stopPropagation()}>
                          <div className="pointer-events-auto">
                            <EditPostButton
                              username={username}
                              postingKey={postingKey || undefined}
                              permlink={mainItem.hiveMetadata.permlink}
                              author={mainItem.hiveMetadata.author}
                              initialTitle={mainItem.title || ''}
                              initialContent={mainItem.hiveMetadata.body || ''}
                              initialTags={mainItem.tags || []}
                              initialImages={extractImagesFromMarkdown(mainItem.hiveMetadata.body || '')}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {!mainItem.hiveMetadata?.body && (
                <div className="flex-1 relative group h-full">
                  {renderMedia(mainItem)}
                </div>
              )}
            </div>
          </>
        )}
        {isExpanded && (
          <div className="flex flex-col h-full overflow-hidden" ref={contentRef}>
            <div className="flex items-center px-3 sm:px-8 py-2 sm:py-5 sticky top-0 z-20 bg-black shadow-md">
              <h2 className="flex-1 text-lg sm:text-3xl font-bold text-white tracking-wide leading-tight" style={{ fontFamily: 'IBMPlexMono, monospace' }}>{mainItem.title}</h2>
              <button
                onClick={e => { e.stopPropagation(); onExpand(); }}
                className="ml-2 sm:ml-6 rounded-full transition-colors p-1 sm:p-2 flex items-center justify-center focus:outline-none"
                aria-label="Fechar"
                title="Fechar"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              >
                <IconX size={35} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain px-1.5 sm:px-8 py-3 sm:py-8 bg-black/90 flex flex-col items-start">
              {/* Exibir vídeo acima do carrossel, se houver */}
              {(() => {
                // Extrair vídeos do markdown
                const videoRegex = /<video[^>]*src=["']([^"'>]+)["'][^>]*>/g;
                const videos: string[] = [];
                let match;
                if (mainItem.hiveMetadata?.body) {
                  while ((match = videoRegex.exec(mainItem.hiveMetadata.body)) !== null) {
                    videos.push(match[1]);
                  }
                }
                if (videos.length > 0) {
                  return (
                    <div className="w-full max-w-3xl mx-auto mb-6">
                      {videos.map((src, idx) => (
                        <video
                          key={src + idx}
                          src={src}
                          controls
                          className="w-full my-4 rounded-lg bg-black"
                        />
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
              {/* Carrossel de imagens */}
              {images.length > 0 && (
                <ImageGallery
                  images={images}
                  isMobile={isMobile}
                  initialIndex={fullscreenIndex}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}