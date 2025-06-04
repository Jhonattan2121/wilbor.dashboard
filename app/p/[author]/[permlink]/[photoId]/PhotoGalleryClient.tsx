'use client';
export const dynamic = 'force-dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './PhotoGallery.module.css';

interface MediaItem {
  type: 'image' | 'video' | 'iframe';
  url: string;
  iframeHtml?: string;
}

export const PhotoGalleryClient = ({
  media = [],
  postTitle,
  postBody,
}: {
  media: MediaItem[];
  postTitle?: string;
  postBody?: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [_touchStart, _setTouchStart] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([]);
  const [_preloadedImages, _setPreloadedImages] = useState<HTMLImageElement[]>([]);

  const memoizedMedia = useMemo(() => media, [media]);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => {
      const images = memoizedMedia.filter((item) => item.type === 'image');
      return (prev + 1) % images.length;
    });
  }, [memoizedMedia]);

  const previousImage = useCallback(() => {
    setCurrentIndex((prev) => {
      const images = memoizedMedia.filter((item) => item.type === 'image');
      return (prev - 1 + images.length) % images.length;
    });
  }, [memoizedMedia]);

 

  useEffect(() => {
    console.log('Key press listener added');
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key);
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') previousImage();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      console.log('Key press listener removed');
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [nextImage, previousImage]);

  useEffect(() => {
    console.log('Media updated:', memoizedMedia);
  }, [memoizedMedia]);

  useEffect(() => {
    console.log('Images loaded state updated:', imagesLoaded);
  }, [imagesLoaded]);

  const renderMedia = (item: MediaItem) => {
    console.log('Trying to render item:', item);
    switch (item.type) {
      case 'image':
        console.log('Rendering image:', item.url);
        return (
          <img
            src={item.url}
            alt={`Image ${currentIndex + 1}`}
            className={styles.image}
            style={{
              opacity: imagesLoaded[currentIndex] ? 1 : 0.5,
              transition: 'opacity 0.3s ease-in-out',
            }}
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              if (imgElement.src.includes('pinataGatewayToken')) {
                const newSrc = imgElement.src.split('?')[0];
                imgElement.src = newSrc;
              }
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', item.url);
            }}
          />
        );

      case 'iframe':
        return (
          <div
            className={styles.iframeContainer}
            dangerouslySetInnerHTML={{ __html: item.iframeHtml || '' }}
          />
        );

      default:
        console.warn('Unsupported media type:', item.type);
        return null;
    }
  };

  // Modify the render condition to be more specific
  if (!media || media.length === 0) {
    console.log('No media found');
    return (
      <div className={styles.infoContainer}>
        <div className={styles.loadingIndicator}>
          No media found. Check console for details.
        </div>
        {postTitle && <h1 className={styles.title}>{postTitle}</h1>}
        {postBody && (
          <div className={styles.body}>
            <ReactMarkdown>{postBody}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Separate iframes and images
  const iframes = media.filter((item) => item.type === 'iframe');
  const images = media.filter((item) => item.type === 'image');

  return (
    <div>
      {/* Featured iframe section */}
      {iframes.length > 0 && (
        <div className={styles.mainIframeContainer}>
          {iframes.map((iframe, index) => (
            <div key={index} className={styles.iframeWrapper}>
              <div
                className={styles.iframeContainer}
                dangerouslySetInnerHTML={{ __html: iframe.iframeHtml || '' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Text section */}
      <div className={styles.infoContainer}>
        {postTitle && <h1 className={styles.title}>{postTitle}</h1>}
        {postBody && (
          <div className={styles.body}>
            <ReactMarkdown
              components={{
                h1: (props) => <h1 className={styles.heading} {...props} />,
                h2: (props) => <h2 className={styles.heading} {...props} />,
                h3: (props) => <h3 className={styles.heading} {...props} />,
                p: (props) => <p className={styles.paragraph} {...props} />,
                a: (props) => <a className={styles.link} {...props} />,
                ul: (props) => <ul className={styles.list} {...props} />,
                ol: (props) => <ol className={styles.orderedList} {...props} />,
                li: (props) => <li className={styles.listItem} {...props} />,
              }}
            >
              {postBody}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className={styles.imageGalleryContainer}>
          <div className={styles.mainImageContainer}>
            {images[currentIndex] && !imagesLoaded[currentIndex] && (
              <div className={styles.loadingIndicator}>Carregando...</div>
            )}
            <button
              onClick={previousImage}
              className={styles.prevButton}
              disabled={images.length <= 1}
            >
              ←
            </button>
            {images[currentIndex] && renderMedia(images[currentIndex])}
            <button
              onClick={nextImage}
              className={styles.nextButton}
              disabled={images.length <= 1}
            >
              →
            </button>
            <div className={styles.counter}>
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};