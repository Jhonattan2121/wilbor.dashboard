'use client';
import { IconX } from '@/components/IconX';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useEffect, useRef, useState } from 'react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import ViewSwitcher from '../../src/app/ViewSwitcher';
import { useDynamicPartnersPost } from '../../src/app/partners/useDynamicPartnersPost';
import PinataEditPostButton from '../dashboard/PinataEditPostButton';

const HIVE_USERNAME = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

export const dynamic = 'force-dynamic';



export default function PartnersPage() {
  const [postingKey, setPostingKey] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  
  const { permlink, markdown, title, images, videos, tags, loading, error } = useDynamicPartnersPost(username || HIVE_USERNAME);
  const swiperRef = useRef<any>(null);
  
  const goPrev = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };
  
  const goNext = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };
  
  const media = [...(images || []), ...(videos || [])];

  useEffect(() => {
    const key = typeof window !== 'undefined' ? localStorage.getItem('dashboard_postingKey') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('dashboard_loginUser') : null;
    setPostingKey(key);
    setUsername(user);
    console.log('[PartnersPage] postingKey lida do localStorage:', key, 'username:', user);
  }, []);

  return (
    <div className="w-full flex flex-col items-start">
      <ViewSwitcher currentSelection="partners" />
      <section className="w-full flex flex-col items-start">
        <div className="w-full max-w-4xl text-left mx-0 px-3 sm:px-8 space-y-4 sm:space-y-6">
          {loading && <p>Carregando conteúdo...</p>}
          {error && <p className="text-red-500">{error}</p>}
          
          {/* Conteúdo dinâmico do Hive */}
          {markdown && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <PinataEditPostButton
                  username={username || HIVE_USERNAME}
                  author={username || HIVE_USERNAME}
                  permlink={permlink || ''}
                  initialTitle={title || ''}
                  initialContent={markdown}
                  initialTags={tags || []}
                  initialImages={images || []}
                  postingKey={postingKey || undefined}
                />
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer>
                  {markdown.replace(/!\[[^\]]*\]\([^\)]+\)/g, '')}
                </MarkdownRenderer>
              </div>
              
              {/* Media gallery */}
              {media.length > 0 && (
                <div className="my-6 w-full">
                  <Swiper
                    modules={[Pagination]}
                    pagination={{ clickable: true }}
                    spaceBetween={8}
                    slidesPerView={1}
                    className="w-full h-[320px]"
                    onSwiper={(swiper) => {
                      swiperRef.current = swiper;
                    }}
                  >
                    {media.map((url, idx) => (
                      <SwiperSlide key={url + idx}>
                        <div className="relative w-full h-[320px] flex items-center justify-center select-none">
                          {url.match(/\.(mp4|webm|mov|avi|mkv|ogg)$/i) ? (
                            <video 
                              src={url} 
                              controls 
                              className="max-w-full max-h-full rounded-lg shadow-lg bg-black" 
                            />
                          ) : (
                            <img 
                              src={url} 
                              alt={`Mídia ${idx + 1}`} 
                              className="max-w-full max-h-full rounded-lg shadow-lg object-contain cursor-pointer"
                              onClick={() => {
                                setFullscreenImg(url);
                                setFullscreenIndex(idx);
                              }}
                            />
                          )}
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  <div className="flex justify-center gap-4 mt-2">
                    <button 
                      onClick={goPrev} 
                      className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Anterior
                    </button>
                    <button 
                      onClick={goNext} 
                      className="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Mensagem quando não há conteúdo dinâmico */}
          {!markdown && !loading && (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Nenhum post sobre parceiros encontrado. 
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Faça login e publique um post sobre parceiros no Hive para exibir o conteúdo aqui.
              </p>
            </div>
          )}
        </div>
      </section>
      
      {/* Fullscreen modal */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
          <button
            className="absolute top-3 right-3 rounded-full p-2.5 z-50 flex items-center justify-center border-2 border-gray-300 shadow-lg hover:rotate-90 transition-all"
            onClick={() => setFullscreenImg(null)}
            aria-label="Fechar"
            title="Fechar"
            style={{ 
              width: 56, 
              height: 56, 
              background: 'transparent', 
              border: 'none', 
              boxShadow: 'none',
            }}
          >
            <IconX size={40} />
          </button>
          <div className="flex items-center justify-center h-screen w-screen">
            <div className="relative w-full h-full flex items-center justify-center" style={{ maxHeight: '90vh', maxWidth: '100vw' }}>
              <div className="sm:hidden w-full h-full">
                <Swiper
                  modules={[Pagination]}
                  pagination={{ clickable: true }}
                  initialSlide={fullscreenIndex}
                  onSlideChange={swiper => {
                    setFullscreenIndex(swiper.activeIndex);
                    setFullscreenImg(images[swiper.activeIndex]);
                  }}
                  className="w-full h-[90vh]"
                >
                  {images.map((img, idx) => (
                    <SwiperSlide key={img}>
                      <div className="flex items-center justify-center w-full h-[90vh] select-none">
                        <img
                          src={img}
                          alt={`Imagem ${idx + 1}`}
                          className="max-w-full max-h-[90vh] rounded-lg shadow-lg object-contain select-none"
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                <style jsx global>{`
                  .swiper-pagination-bullet {
                    width: 10px !important;
                    height: 10px !important;
                    margin: 0 3px !important;
                    background: #fff;
                    opacity: 0.6;
                    border: none !important;
                    transition: all 0.2s;
                  }
                  .swiper-pagination-bullet-active {
                    background: #e11d48 !important;
                    opacity: 1 !important;
                  }
                `}</style>
              </div>
              <div className="hidden sm:flex relative w-full h-full items-center justify-center">
                <img
                  src={fullscreenImg}
                  alt="Imagem em tela cheia"
                  className="object-contain max-h-[90vh] max-w-full w-auto h-auto select-none"
                  style={{ pointerEvents: 'none' }}
                />
                <button
                  className="absolute left-0 top-0 h-full w-1/3 cursor-pointer z-10 focus:outline-none active:outline-none border-none bg-transparent p-0 m-0"
                  tabIndex={-1}
                  style={{ 
                    outline: 'none', 
                    border: 'none', 
                    boxShadow: 'none', 
                    background: 'transparent',
                  }}
                  onClick={() => {
                    const prev = fullscreenIndex === 0 
                      ? images.length - 1 
                      : fullscreenIndex - 1;
                    setFullscreenImg(images[prev]);
                    setFullscreenIndex(prev);
                  }}
                  aria-label="Imagem anterior"
                />
                <button
                  className="absolute right-0 top-0 h-full w-1/3 cursor-pointer z-10 focus:outline-none active:outline-none border-none bg-transparent p-0 m-0"
                  tabIndex={-1}
                  style={{ 
                    outline: 'none', 
                    border: 'none', 
                    boxShadow: 'none', 
                    background: 'transparent',
                  }}
                  onClick={() => {
                    const next = fullscreenIndex === images.length - 1 
                      ? 0 
                      : fullscreenIndex + 1;
                    setFullscreenImg(images[next]);
                    setFullscreenIndex(next);
                  }}
                  aria-label="Próxima imagem"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
