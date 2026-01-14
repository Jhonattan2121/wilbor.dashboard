'use client';

import { uploadFileToIPFS } from '@/utils/ipfs';
import { uploadVideoToVimeo } from '@/utils/vimeo';
import { type Operation } from '@hiveio/dhive';
import { useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';
import PostContentEditorPreview from '../../src/components/PostContentEditorPreview';
import TagSuggestions from '../../src/components/TagSuggestions';
import MediaUploader from './MediaUploader';
import { useMediaContentSync } from './MediaContentSync';

interface NewEditPostButtonProps {
  username: string;
  postingKey?: string;
  permlink: string;
  author: string;
  initialTitle: string;
  initialContent: string;
  initialTags: string[];
  initialImages: string[];
}

export default function NewEditPostButton({
  username,
  postingKey,
  permlink,
  author,
  initialTitle,
  initialContent,
  initialTags,
  initialImages,
}: NewEditPostButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);

  // Hook de sincronização de mídia e conteúdo
  const mediaContentSync = useMediaContentSync({
    files,
    previews,
    content,
    uploadProgress,
    onContentChange: setContent,
    onFilesChange: setFiles,
    onPreviewsChange: setPreviews,
    onUploadProgressChange: setUploadProgress,
  });

  // Token de Gateway do Pinata
  const PINATA_GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN;

  // Desabilitar hovers por 1 segundo ao abrir o modal
  useEffect(() => {
    if (showForm) {
      setIsReady(false);
      
      // Adicionar classe ao body para desabilitar hovers globalmente
      document.body.classList.add('disable-hover');
      
      // Forçar blur em todos os elementos
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      
      // Remover todos os title attributes temporariamente
      const elementsWithTitle = document.querySelectorAll('[title]');
      const originalTitles = new Map();
      elementsWithTitle.forEach((el) => {
        const title = el.getAttribute('title');
        if (title) {
          originalTitles.set(el, title);
          el.removeAttribute('title');
        }
      });
      
      const timer = setTimeout(() => {
        setIsReady(true);
        document.body.classList.remove('disable-hover');
        
        // Restaurar titles
        originalTitles.forEach((title, el) => {
          el.setAttribute('title', title);
        });
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('disable-hover');
        
        // Restaurar titles no cleanup
        originalTitles.forEach((title, el) => {
          el.setAttribute('title', title);
        });
      };
    }
  }, [showForm]);

  // Inicializar com dados do post APENAS ao abrir o modal
  // Removido as props das dependências para evitar reset durante digitação
  useEffect(() => {
    if (showForm) {
      setTitle(initialTitle || '');
      setContent(initialContent || '');
      setTags(initialTags || []);
      setPreviews(initialImages || []);
      setFiles([]);
      setUploadProgress(initialImages?.length ? Array(initialImages.length).fill(100) : []);
      setThumbnailIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  useEffect(() => {
    if (!loading && error && error.includes('cancelada')) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

    const getIpfsGatewayUrl = (hash: string, _getIpfsPublicUrl?: string): string => {
    return `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
  };

  const _getIpfsPublicUrl = (hash: string, _fileName?: string): string => {
    return `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
  };

  // Função para processar e fazer upload dos arquivos selecionados
  const handleMediaSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    setUploadProgress(prev => [...prev, ...selectedFiles.map(() => 0)]);

    function getFileExtension(file: File): string {
      const name = file.name;
      if (name && name.includes('.')) {
        return name.split('.').pop() || '';
      }
      if (file.type && file.type.includes('/')) {
        return file.type.split('/')[1];
      }
      return '';
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        setLoading(true);
        const ext = getFileExtension(file);
        const normalizedExt = ext.toLowerCase();
        const videoExtensions = ['mp4', 'mov', 'webm', 'ogg', 'm4v', 'avi', 'flv', 'mkv'];
        const mimeType = file.type?.toLowerCase() || '';
        const isVideo = mimeType.startsWith('video/') || videoExtensions.includes(normalizedExt);
        const fileName = file.name || `media-${i + 1}${ext ? '.' + ext : ''}`;
        let mediaMarkdown = '';

        if (isVideo) {
          const vimeoResult = await uploadVideoToVimeo(file);
          const videoUrl =
            vimeoResult?.link ||
            (typeof vimeoResult?.uri === 'string' ? `https://vimeo.com${vimeoResult.uri}` : '');
          const embedFromApi = typeof vimeoResult?.player_embed_url === 'string'
            ? vimeoResult.player_embed_url
            : '';
          const vimeoId = (() => {
            if (typeof vimeoResult?.uri === 'string') {
              const id = vimeoResult.uri.split('/').pop();
              if (id) return id;
            }
            if (typeof vimeoResult?.link === 'string') {
              const id = vimeoResult.link.split('/').pop();
              if (id) return id;
            }
            return '';
          })();
          const embedUrl = embedFromApi || (vimeoId
            ? `https://player.vimeo.com/video/${vimeoId}`
            : '');

          if (!videoUrl && !embedUrl) {
            throw new Error('Vimeo não retornou um link válido');
          }

          mediaMarkdown = embedUrl
            ? `<iframe src="${embedUrl}" width="100%" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
            : `<video width="100%" controls src="${videoUrl}"></video>`;
        } else {
          const ipfsResult = await uploadFileToIPFS(file);
          const ipfsUrl = getIpfsGatewayUrl(ipfsResult.IpfsHash, fileName);
          mediaMarkdown = `![image](${ipfsUrl})`;
        }

        setContent(prev => {
          const texto = prev.trim();
          return texto.length > 0 ? `${texto}\n\n${mediaMarkdown}\n` : `${mediaMarkdown}\n`;
        });
      } catch (err) {
        console.error('Erro ao enviar mídia para IPFS:', err);
        setError('Erro ao enviar mídia para o IPFS.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Função para remover um arquivo da lista
  const handleMediaRemoved = (index: number) => {
    mediaContentSync.handleMediaRemoved(index);
  };

  const extractMediaLinksFromMarkdown = (markdown: string) => {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^)\s]+)\)/g;
    const videoRegex = /<video[^>]*src=["']([^"'>\s]+)["'][^>]*>/g;
    const iframeRegex = /<iframe[^>]*src=["']([^"'>\s]+)["'][^>]*><\/iframe>/g;
    const images: string[] = [];
    const videos: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push(match[1]);
    }
    
    while ((match = videoRegex.exec(markdown)) !== null) {
      videos.push(match[1]);
    }

    while ((match = iframeRegex.exec(markdown)) !== null) {
      videos.push(match[1]);
    }

    return { images, videos };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Por favor, insira um título');
      return;
    }

    if (!content.trim()) {
      setError('Por favor, adicione algum conteúdo ao post');
      return;
    }

    if (!postingKey && !(window as any).hive_keychain) {
      setError('Chave de postagem não fornecida ou Hive Keychain não instalado');
      return;
    }

    if (username.toLowerCase() !== author.toLowerCase()) {
      setError('Você não tem permissão para editar este post');
      return;
    }

    setLoading(true);
    setError('');

    const keychainTimeout = setTimeout(() => {
      setLoading(false);
      setError('Operação expirada ou não confirmada no Keychain. Tente novamente.');
    }, 15000);

    try {
      const postBody = content.trim();
      const { images, videos } = extractMediaLinksFromMarkdown(postBody);
      
      let orderedImages = images;
      if (thumbnailIndex >= 0 && thumbnailIndex < images.length) {
        const thumb = orderedImages[thumbnailIndex];
        orderedImages = [thumb, ...orderedImages.filter((img, idx) => idx !== thumbnailIndex)];
      }
      
      const tagArray = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag !== '');
      
      const jsonMetadata = {
        tags: tagArray,
        image: orderedImages,
        video: videos,
        app: 'wilbor.art/dashboard',
      };
      
      const parentPermlink = tagArray.length > 0 ? tagArray[0] : 'blog';
      
      const operations: Operation[] = [
        [
          'comment',
          {
            parent_author: '',
            parent_permlink: parentPermlink,
            author: username,
            permlink: permlink,
            title: title,
            body: postBody,
            json_metadata: JSON.stringify(jsonMetadata),
          },
        ],
      ];

      let updateSuccess = false;
      if (postingKey) {
        await sendHiveOperation(postingKey, operations);
        updateSuccess = true;
      } else {
        updateSuccess = await new Promise((resolve, reject) => {
          if (typeof window === 'undefined' || !(window as any).hive_keychain) {
            reject(new Error('Hive Keychain não está instalado'));
            return;
          }

          (window as any).hive_keychain.requestBroadcast(
            username,
            operations,
            'Posting',
            (response: any) => {
              if (response.success) {
                resolve(true);
              } else {
                if (
                  response.error === 'user_cancel' ||
                  response.message?.toLowerCase().includes('cancel') ||
                  response.message?.toLowerCase().includes('cancelado')
                ) {
                  reject(new Error('Operação cancelada pelo usuário'));
                } else {
                  reject(new Error(response.message || 'Erro ao atualizar com Keychain'));
                }
              }
            },
          );
        });
      }

      if (!updateSuccess) {
        clearTimeout(keychainTimeout);
        throw new Error('Falha ao atualizar o post');
      }

      clearTimeout(keychainTimeout);
      setSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      clearTimeout(keychainTimeout);
      setError('Falha ao atualizar o post: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* CSS para desabilitar hovers globalmente */}
      {showForm && !isReady && (
        <style dangerouslySetInnerHTML={{
          __html: `
            body.disable-hover,
            body.disable-hover *,
            body.disable-hover *::before,
            body.disable-hover *::after {
              pointer-events: none !important;
              cursor: wait !important;
            }
            body.disable-hover *:hover,
            body.disable-hover *:focus {
              background-color: inherit !important;
              color: inherit !important;
              opacity: inherit !important;
              transform: none !important;
              box-shadow: none !important;
            }
            /* Desabilita tooltips do navegador */
            body.disable-hover [title] {
              pointer-events: none !important;
            }
          `,
        }} />
      )}
      
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Delay para o cursor sair de cima de qualquer elemento
          setTimeout(() => {
            setShowForm(true);
          }, 50);
        }}
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors shadow-md hover:shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        <span className="font-medium">Editar</span>
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-0 pt-4 sm:pt-0 pb-0 sm:p-4 overscroll-contain">
          {/* Overlay que bloqueia TUDO por 1 segundo */}
          {!isReady && (
            <div className="fixed inset-0 z-[9999] bg-transparent cursor-wait" />
          )}
          
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => {
              if (!isReady) return; // Não permite fechar antes de estar pronto
              if (!loading) {
                setShowForm(false);
              } else if (confirm('Deseja cancelar a operação em andamento?')) {
                setLoading(false);
                setError('');
                setShowForm(false);
              }
            }}
          />

          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-700 flex flex-col m-2 sm:m-0">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-1 pb-2 border-b border-gray-700">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  ✏️ Editar Post
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Atualize seu conteúdo com o editor avançado
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-white p-2 -mr-2 transition-colors"
                onClick={() => {
                  if (!loading) {
                    setShowForm(false);
                    return;
                  }
                  if (confirm('Deseja cancelar a operação em andamento?')) {
                    setLoading(false);
                    setError('');
                    setShowForm(false);
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="bg-green-800 bg-opacity-30 border border-green-600 text-green-400 p-4 rounded-lg mb-4 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Post atualizado com sucesso! Recarregando a página...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" style={{ pointerEvents: isReady ? 'auto' : 'none', opacity: isReady ? 1 : 0.7 }}>
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    📝 Título do Post *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                    placeholder="Digite o título do seu post"
                    title=""
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Mídia Uploader */}
                <div>
                  <MediaUploader
                    onMediaSelected={handleMediaSelected}
                    onMediaRemoved={handleMediaRemoved}
                    files={files}
                    previews={previews}
                    uploadProgress={uploadProgress}
                    thumbnailIndex={thumbnailIndex}
                    onThumbnailChange={setThumbnailIndex}
                  />
                </div>

                {/* Editor de Conteúdo */}
                <div>
                  <PostContentEditorPreview
                    content={content}
                    onChange={value => {
                      const sync = mediaContentSync;
                      sync.handleContentChange(value);
                    }}
                  />
                </div>

                {/* Tags com sugestões */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    🏷️ Tags *
                  </label>
                  
                  {/* Tags atuais */}
                  <div className="flex overflow-x-auto flex-nowrap gap-2 mb-3 pb-1 hide-scrollbar sm:flex-wrap sm:overflow-visible">
                    {tags.map((tag, idx) => (
                      <span
                        key={tag + idx}
                        className="flex-shrink-0 flex items-center bg-green-600 text-white rounded-full px-4 py-2 text-sm shadow-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-2 text-green-200 hover:text-white focus:outline-none"
                          onClick={() => setTags(tags.filter((t, i) => i !== idx))}
                          aria-label={`Remover tag ${tag}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Input de tags */}
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          (e.key === 'Enter' || e.key === ',' || e.key === ' ') &&
                          tagInput.trim()
                        ) {
                          e.preventDefault();
                          const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
                          if (newTag && !tags.includes(newTag) && tags.length < 10 && newTag.length <= 24) {
                            setTags([...tags, newTag]);
                          }
                          setTagInput('');
                        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                          setTags(tags.slice(0, -1));
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Digite uma tag e pressione Enter..."
                      maxLength={24}
                      disabled={tags.length >= 10}
                      title=""
                      autoComplete="off"
                    />
                    {tagInput.trim() && (
                      <button
                        type="button"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        onClick={() => {
                          const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
                          if (newTag && !tags.includes(newTag) && tags.length < 10 && newTag.length <= 24) {
                            setTags([...tags, newTag]);
                            setTagInput('');
                          }
                        }}
                      >
                        Adicionar
                      </button>
                    )}
                  </div>

                  {/* Sugestões de tags */}
                  <TagSuggestions
                    currentTags={tags}
                    onTagSelect={(tag) => {
                      if (tags.length < 10 && !tags.includes(tag)) {
                        setTags([...tags, tag]);
                      }
                    }}
                    maxTags={10}
                  />

                  <div className="text-xs text-gray-400 mt-2">
                    {tags.length}/10 tags • Pressione Enter, vírgula ou espaço para adicionar
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <div className="bg-red-800 bg-opacity-30 border border-red-600 text-red-400 p-4 rounded-lg flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(false);
                      setError('');
                      setShowForm(false);
                    }}
                    className="px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 ${
                      loading ? 'bg-green-800 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                        </svg>
                        Atualizar Post
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
