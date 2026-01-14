'use client';

import { useEffect, useState } from 'react';

interface MediaUploaderProps {
  onMediaSelected: (files: File[]) => void;
  onMediaRemoved: (index: number) => void;
  previews: string[];
  files: File[];
  uploadProgress: number[];
  thumbnailIndex: number;
  onThumbnailChange: (index: number) => void;
}

export default function MediaUploader({
  onMediaSelected,
  onMediaRemoved,
  previews,
  files,
  uploadProgress,
  thumbnailIndex,
  onThumbnailChange,
}: MediaUploaderProps) {
  const [currentImagePage, setCurrentImagePage] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [_isDragging, setIsDragging] = useState(false);

  // Funções para controle de swipe no carrossel
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50; 
    
    if (distance > minSwipeDistance) {
      setCurrentImagePage(prev => 
        Math.min(Math.ceil(previews.length / 2) - 1, prev + 1),
      );
    }
    else if (distance < -minSwipeDistance) {
      setCurrentImagePage(prev => Math.max(0, prev - 1));
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
  };

  // Função para avançar ou retroceder imagens no carrossel
  const handleImageCarousel = (direction: 'next' | 'prev') => {
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);

    setCurrentImagePage(prevPage => {
      if (direction === 'next') {
        return Math.min(prevPage + 1, Math.ceil(previews.length / 2) - 1);
      } else {
        return Math.max(prevPage - 1, 0);
      }
    });
  };

  // Reset current page when media list changes
  useEffect(() => {
    if (previews.length === 0) {
      setCurrentImagePage(0);
    } else if (currentImagePage > Math.ceil(previews.length / 2) - 1) {
      setCurrentImagePage(Math.ceil(previews.length / 2) - 1);
    }
  }, [previews.length, currentImagePage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    onMediaSelected(selectedFiles);
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium mb-1">Conteúdo</label>
        <label htmlFor="image-upload-btn" className="flex items-center text-xs text-blue-500 hover:text-blue-400 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Adicionar imagens
        </label>
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="image-upload-btn"
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">Mídias do post</label>
            <p className="text-xs text-gray-400 mt-1 sm:mt-0">Toque na mídia para selecionar como capa</p>
          </div>
          
          <div className="relative">
            {/* Botão anterior */}
            {currentImagePage > 0 && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleImageCarousel('prev');
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 rounded-full p-2 text-white"
                aria-label="Imagens anteriores"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Container do carrossel */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out" 
                style={{ transform: `translateX(-${currentImagePage * 100}%)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {Array.from({ length: Math.ceil(previews.length / 2) }).map((_, pageIndex) => (
                  <div key={pageIndex} className="w-full flex-shrink-0 grid grid-cols-2 gap-3">
                    {previews.slice(pageIndex * 2, pageIndex * 2 + 2).map((preview, imageIndex) => {
                      const globalIndex = pageIndex * 2 + imageIndex;
                      const file = files[globalIndex];
                      const isVideo = file && file.type.startsWith('video/');
                      console.log('Renderizando mídia:', { 
                        globalIndex, 
                        preview, 
                        isVideo, 
                        fileType: file?.type, 
                        fileSize: file?.size, 
                      });
                      
                      return (
                        <div 
                          key={globalIndex} 
                          className={`relative cursor-pointer border-2 ${thumbnailIndex === globalIndex ? 'border-green-500' : 'border-transparent'} rounded-lg`}
                          onClick={(e) => {
                            e.preventDefault();
                            onThumbnailChange(globalIndex);
                            console.log('Thumbnail selecionada:', { globalIndex, preview });
                          }}
                          title=""
                        >
                          {isVideo ? (
                            <video 
                              src={preview} 
                              controls 
                              title=""
                              className="w-full h-40 object-cover rounded-lg bg-black"
                              onError={(e) => console.error('Erro ao carregar vídeo:', e)}
                            />
                          ) : (
                            <img 
                              src={preview} 
                              alt="" 
                              title=""
                              className="w-full h-40 object-cover rounded-lg"
                              onError={(e) => console.error('Erro ao carregar imagem:', e)}
                            />
                          )}
                          {thumbnailIndex === globalIndex && (
                            <div className="absolute top-2 left-2 bg-green-600 text-white rounded-full p-1" title="">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          {uploadProgress[globalIndex] > 0 && uploadProgress[globalIndex] < 100 && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center" title="">
                              <div className="w-16 h-16 rounded-full border-4 border-white border-t-transparent animate-spin" title=""></div>
                            </div>
                          )}
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-red-600 rounded-full p-2 opacity-90 hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onMediaRemoved(globalIndex);
                            }}
                            aria-label={`Remover imagem ${globalIndex + 1}`}
                            title=""
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Botão próximo */}
            {currentImagePage < Math.ceil(previews.length / 2) - 1 && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleImageCarousel('next');
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 rounded-full p-2 text-white"
                aria-label="Próximas imagens"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
