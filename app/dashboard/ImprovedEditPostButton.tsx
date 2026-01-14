'use client';

import { uploadFileToIPFS } from '@/utils/ipfs';
import { type Operation } from '@hiveio/dhive';
import { useCallback, useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';
import PostContentEditorPreview from '../../src/components/PostContentEditorPreview';
import TagSuggestions from '../../src/components/TagSuggestions';
import { useMediaContentSync } from './MediaContentSync';
import MediaUploader from './MediaUploader';

interface ImprovedEditPostButtonProps {
  username: string;
  postingKey?: string;
  permlink: string;
  author: string;
  initialTitle: string;
  initialContent: string;
  initialTags: string[];
  initialImages: string[];
}

export default function ImprovedEditPostButton({
  username,
  postingKey,
  permlink,
  author,
  initialTitle,
  initialContent,
  initialTags,
  initialImages,
}: ImprovedEditPostButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
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
  const [loadingPost, setLoadingPost] = useState(false);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);
  const [previousThumbnailIndex, setPreviousThumbnailIndex] = useState<number>(-1);

  const PINATA_GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN;

  // Hook de sincronização
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

  // Função para garantir que o permlink esteja dentro do limite permitido
  const ensureSafePermlink = (pl: string): string => {
    if (!pl) return `post-${Date.now().toString(36)}`;
    
    try {
      if (pl.startsWith('{') && pl.includes('"') && pl.includes(':')) {
        const parsed = JSON.parse(pl);
        console.error('ERRO CRÍTICO: Permlink contém um objeto JSON!', parsed);
        return `fixed-permlink-${Date.now().toString(36)}`;
      }
    } catch {
      // Não é JSON válido, continua
    }
    
    if (pl.length > 200 || pl.includes('{') || pl.includes('"') || 
        pl.includes('http') || pl.includes('https') || pl.includes('[') ||
        pl.includes('\\') || pl.includes('/')) {
      
      const cleanedPart = pl.replace(/[^a-z0-9\-]/g, '');
      
      if (cleanedPart && cleanedPart.length >= 5) {
        return cleanedPart.substring(0, 100);
      }
      
      return `post-${Date.now().toString(36)}`;
    }

    if (pl.length > 250) {
      return pl.substring(0, 250);
    }
    
    return pl;
  };

  useEffect(() => {
    if (!loading && error && error.includes('cancelada')) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  // Função para remover imagem do conteúdo markdown
  const removeImageFromContent = (imageUrl: string, currentContent: string): string => {
    if (!imageUrl || !currentContent) return currentContent;
    
    console.log('Removendo imagem do conteúdo:', imageUrl);
    
    // Extrai o hash IPFS da URL se for uma URL do Pinata
    const ipfsHashMatch = imageUrl.match(/ipfs\/([a-zA-Z0-9]+)/);
    const hashToSearch = ipfsHashMatch ? ipfsHashMatch[1] : null;
    
    // Remove a linha que contém a imagem markdown
    const lines = currentContent.split('\n');
    const filteredLines = lines.filter(line => {
      // Remove linhas que contêm a URL completa da imagem
      if (line.includes(imageUrl)) {
        return false;
      }
      
      // Remove linhas que contêm o hash IPFS (caso a URL tenha parâmetros diferentes)
      if (hashToSearch && line.includes(hashToSearch)) {
        // Verifica se é realmente uma linha de imagem markdown
        if (line.trim().startsWith('![') || line.includes('![image]') || line.includes('![')) {
          return false;
        }
      }
      
      return true;
    });
    
    const result = filteredLines.join('\n').trim();
    console.log('Imagem removida do conteúdo');
    return result;
  };

  // Função para adicionar imagem ao conteúdo markdown
  const addImageToContent = (imageUrl: string, currentContent: string): string => {
    if (!imageUrl) return currentContent;
    
    // Verifica se a imagem já está no conteúdo
    if (currentContent.includes(imageUrl)) {
      return currentContent;
    }
    
    // Adiciona a imagem no final do conteúdo
    const markdown = `![image](${imageUrl})`;
    const texto = currentContent.trim();
    return texto.length > 0 ? `${texto}\n\n${markdown}\n` : `${markdown}\n`;
  };

  const resetForm = useCallback(() => {
    setTitle(initialTitle || '');
    
    // Remove a thumbnail (primeira imagem) do conteúdo se ela estiver lá
    let processedContent = initialContent || '';
    if (initialImages && initialImages.length > 0) {
      const thumbnailUrl = initialImages[0]; // A primeira imagem geralmente é a thumbnail
      if (thumbnailUrl) {
        // Extrai o hash IPFS da URL se for uma URL do Pinata
        const ipfsHashMatch = thumbnailUrl.match(/ipfs\/([a-zA-Z0-9]+)/);
        const hashToSearch = ipfsHashMatch ? ipfsHashMatch[1] : null;
        
        // Remove a linha que contém a imagem markdown
        const lines = processedContent.split('\n');
        const filteredLines = lines.filter(line => {
          // Remove linhas que contêm a URL completa da imagem
          if (line.includes(thumbnailUrl)) {
            return false;
          }
          
          // Remove linhas que contêm o hash IPFS (caso a URL tenha parâmetros diferentes)
          if (hashToSearch && line.includes(hashToSearch)) {
            // Verifica se é realmente uma linha de imagem markdown
            if (line.trim().startsWith('![') || line.includes('![image]') || line.includes('![')) {
              return false;
            }
          }
          
          return true;
        });
        
        processedContent = filteredLines.join('\n').trim();
        console.log('Thumbnail removida automaticamente do conteúdo ao carregar post');
      }
    }
    
    setContent(processedContent);
    setTags(initialTags || []);
    setTagInput('');
    setFiles([]);
    setPreviews(initialImages?.length ? initialImages.map((url) => url) : []);
    setUploadProgress(
      initialImages?.length ? Array(initialImages.length).fill(100) : [],
    );
    setError('');
    setSuccess(false);
    setThumbnailIndex(0);
    setPreviousThumbnailIndex(-1);
  }, [initialTitle, initialContent, initialTags, initialImages]);

  // Garantir que os estados sejam atualizados APENAS quando o modal é aberto
  // Removido resetForm das dependências para evitar reset durante digitação
  useEffect(() => {
    if (showForm) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  // Prevenir ativação de hovers durante o mount do modal
  useEffect(() => {
    if (showForm) {
      setIsMounted(false);
      const timer = setTimeout(() => {
        setIsMounted(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
    }
  }, [showForm]);

  // Handler customizado para mudança de thumbnail
  const handleThumbnailChange = (newIndex: number) => {
    if (!showForm) return;
    
    console.log('Thumbnail mudou para:', newIndex);
    
    // Extrai URLs das imagens do conteúdo atual
    const { images } = extractMediaLinksFromMarkdown(content);
    
    console.log('Imagens encontradas no conteúdo:', images);
    console.log('Índice anterior:', previousThumbnailIndex, 'Novo índice:', newIndex);
    
    // Se havia um thumbnail anterior, adiciona de volta ao conteúdo
    if (previousThumbnailIndex >= 0 && previousThumbnailIndex < images.length) {
      const previousImageUrl = images[previousThumbnailIndex];
      if (previousImageUrl) {
        console.log('Adicionando imagem anterior de volta:', previousImageUrl);
        setContent(prev => {
          const newContent = addImageToContent(previousImageUrl, prev);
          console.log('Conteúdo após adicionar imagem anterior');
          return newContent;
        });
      }
    }

    // Remove a nova imagem selecionada como thumbnail do conteúdo
    if (newIndex >= 0 && newIndex < images.length) {
      const thumbnailImageUrl = images[newIndex];
      if (thumbnailImageUrl) {
        console.log('Removendo nova thumbnail do conteúdo:', thumbnailImageUrl);
        setContent(prev => {
          const newContent = removeImageFromContent(thumbnailImageUrl, prev);
          console.log('Conteúdo após remover thumbnail');
          return newContent;
        });
      } else {
        console.warn('URL da thumbnail não encontrada no índice:', newIndex);
      }
    } else {
      console.warn('Índice de thumbnail inválido:', newIndex, 'Total de imagens:', images.length);
    }

    setPreviousThumbnailIndex(newIndex);
    setThumbnailIndex(newIndex);
  };

  const fetchPostFromHive = async (
    author: string,
    permlink: string,
  ): Promise<any> => {
    setLoadingPost(true);
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
      console.error('Erro ao buscar dados do post:', error);
      return null;
    } finally {
      setLoadingPost(false);
    }
  };

  const getIpfsGatewayUrl = (hash: string, _fileName?: string): string => {
    return `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
  };

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
        const result = await uploadFileToIPFS(file);
        const ext = getFileExtension(file);
        const isVideo = file.type.startsWith('video/');
        const fileName = file.name || `media-${i + 1}${ext ? '.' + ext : ''}`;
        const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);

        setContent(prev => {
          const texto = prev.trim();
          const mediaMarkdown = isVideo
            ? `<video width="100%" controls src="${ipfsUrl}"></video>`
            : `![image](${ipfsUrl})`;
          
          return texto.length > 0 ? `${texto}\n\n${mediaMarkdown}\n` : `${mediaMarkdown}\n`;
        });
      } catch (err) {
        console.error('Erro ao enviar imagem para IPFS:', err);
        setError('Erro ao enviar imagem para o IPFS.');

        const currentIndex = files.length - selectedFiles.length + i;
        const newFiles = [...files];
        const newPreviews = [...previews];
        const newProgress = [...uploadProgress];

        if (newPreviews[currentIndex] && newPreviews[currentIndex].startsWith('blob:')) {
          URL.revokeObjectURL(newPreviews[currentIndex]);
        }

        newFiles.splice(currentIndex, 1);
        newPreviews.splice(currentIndex, 1);
        newProgress.splice(currentIndex, 1);

        setFiles(newFiles);
        setPreviews(newPreviews);
        setUploadProgress(newProgress);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMediaRemoved = (index: number) => {
    mediaContentSync.handleMediaRemoved(index);
  };

  const getFileExtension = (file: File): string => {
    const name = file.name;
    if (name && name.includes('.')) {
      return name.split('.').pop() || '';
    }
    if (file.type && file.type.includes('/')) {
      return file.type.split('/')[1];
    }
    return '';
  };

  const extractMediaLinksFromMarkdown = (markdown: string) => {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^)\s]+)\)/g;
    const videoRegex = /<video[^>]*src=["']([^"'>\s]+)["'][^>]*>/g;
    const images: string[] = [];
    const videos: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push(match[1]);
    }
    
    while ((match = videoRegex.exec(markdown)) !== null) {
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
    
    if (!permlink) {
      setError('Permlink não fornecido.');
      setLoading(false);
      return;
    }
    
    const safePermlink = ensureSafePermlink(permlink);
    const keychainTimeout = setTimeout(() => {
      setLoading(false);
      setError('Operação expirada ou não confirmada no Keychain. Tente novamente.');
    }, 15000);
    
    try {
      const ipfsResults = [];
      const newFiles = files.filter(f => f.size > 0 && f.name !== 'placeholder');
      let newContent = content.trim();
      
      for (let i = 0; i < newFiles.length; i++) {
        try {
          const result = await uploadFileToIPFS(newFiles[i]);
          ipfsResults.push(result);
          const ext = getFileExtension(newFiles[i]);
          const isVideo = newFiles[i].type.startsWith('video/');
          const fileName = newFiles[i].name || `media-${i + 1}${ext ? '.' + ext : ''}`;
          const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);
          
          if (!newContent.includes(ipfsUrl)) {
            newContent += isVideo
              ? `\n\n<video width="100%" controls src="${ipfsUrl}"></video>\n`
              : `\n\n![image](${ipfsUrl})\n`;
          }
          
          const newProgress = [...uploadProgress];
          newProgress[i] = 100;
          setUploadProgress(newProgress);
        } catch {
          setError(`Falha ao fazer upload da mídia ${i + 1}`);
          setLoading(false);
          clearTimeout(keychainTimeout);
          return;
        }
      }
      
      // Remove a imagem do thumbnail do conteúdo antes de enviar
      let postBody = newContent;
      const { images: allImages, videos: _videos } = extractMediaLinksFromMarkdown(postBody);
      
      // Remove a imagem do thumbnail do conteúdo se ela estiver lá
      if (thumbnailIndex >= 0 && thumbnailIndex < allImages.length) {
        const thumbnailImageUrl = allImages[thumbnailIndex];
        if (thumbnailImageUrl) {
          postBody = removeImageFromContent(thumbnailImageUrl, postBody);
        }
      }
      
      // Re-extrai as imagens após remover o thumbnail
      const { images, videos: finalVideos } = extractMediaLinksFromMarkdown(postBody);
      
      let orderedImages = images;
      if (thumbnailIndex >= 0 && thumbnailIndex < allImages.length) {
        const thumb = allImages[thumbnailIndex];
        // Adiciona o thumbnail no início do array de imagens para o metadata
        orderedImages = [thumb, ...images.filter(img => img !== thumb)];
      }
      
      const tagArray = tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag !== '');
      
      const jsonMetadata = {
        tags: tagArray,
        image: orderedImages,
        video: finalVideos,
        app: 'wilbor.art/dashboard',
      };
      
      let parentPermlink = tagArray.length > 0 ? tagArray[0] : '';
      try {
        let originalPost = await fetchPostFromHive(author, permlink);
        if (!originalPost && safePermlink !== permlink) {
          originalPost = await fetchPostFromHive(author, safePermlink);
        }
        if (originalPost && originalPost.parent_permlink) {
          parentPermlink = originalPost.parent_permlink;
        }
      } catch {
        // Continua
      }
      
      let updateSuccess = false;
      if (postingKey) {
        updateSuccess = await updateHivePostWithEncryptedKey(
          username,
          title,
          postBody,
          safePermlink,
          parentPermlink,
          jsonMetadata,
          postingKey,
        );
      } else {
        try {
          updateSuccess = await updateHivePostWithKeychain(
            username,
            title,
            postBody,
            safePermlink,
            parentPermlink,
            jsonMetadata,
          );
        } catch (keychainError: any) {
          if (keychainError.isCancelled === true) {
            setError('Operação cancelada pelo usuário');
            setLoading(false);
            clearTimeout(keychainTimeout);
            return;
          }
          clearTimeout(keychainTimeout);
          throw keychainError;
        }
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
      
      const { images: extractedImages, videos: extractedVideos } = extractMediaLinksFromMarkdown(postBody);
      const extractedUrls = [...extractedImages, ...extractedVideos];
      const placeholderProgress = extractedUrls.map(() => 100);
      const placeholderFiles = extractedUrls.map(() => new File([], 'placeholder'));
      setFiles(placeholderFiles);
      setPreviews(extractedUrls);
      setUploadProgress(placeholderProgress);
    } catch (error: any) {
      clearTimeout(keychainTimeout);
      setError('Falha ao atualizar o post: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const updateHivePostWithKeychain = (
    author: string,
    title: string,
    body: string,
    permlink: string,
    parentPermlink: string,
    jsonMetadata: any,
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !(window as any).hive_keychain) {
        reject(new Error('Hive Keychain não está instalado'));
        return;
      }

      const safePermlink = permlink && permlink.length > 250 
        ? permlink.substring(0, 250) 
        : permlink;
      
      const operations: [string, any][] = [[
        'comment',
        {
          parent_author: '',
          parent_permlink: parentPermlink,
          author,
          permlink: safePermlink,
          title,
          body,
          json_metadata: JSON.stringify(jsonMetadata),
        },
      ]];
      
      (window as any).hive_keychain.requestBroadcast(
        author,
        operations,
        'Posting',
        (response: any) => {
          if (response.success) {
            resolve(true);
          } else {
            if (
              response.error === 'user_cancel' ||
              response.message?.toLowerCase().includes('cancel') ||
              response.message?.toLowerCase().includes('cancelado') ||
              response.message?.toLowerCase().includes('rejected') ||
              response.message?.toLowerCase().includes('rejeitado') ||
              response.error === 'declined'
            ) {
              const cancelError = new Error('Operação cancelada pelo usuário');
              (cancelError as any).isCancelled = true;
              reject(cancelError);
            } else {
              const errorMsg = response.message || 'Erro ao atualizar com Keychain';
              if (errorMsg.toLowerCase().includes('permlink is too long') || 
                  errorMsg.toLowerCase().includes('permlink muito longo')) {
                const permlinkError = new Error('Erro: Permlink muito longo. Por favor, tente novamente com um título mais curto.');
                reject(permlinkError);
              } else {
                reject(new Error(errorMsg));
              }
            }
          }
        },
      );
    });
  };

  const updateHivePostWithEncryptedKey = async (
    author: string,
    title: string,
    body: string,
    permlink: string,
    parentPermlink: string,
    jsonMetadata: any,
    encryptedPrivateKey: string,
  ) => {
    try {
      const safePermlink = permlink && permlink.length > 250 
        ? permlink.substring(0, 250) 
        : permlink;
        
      const operations: Operation[] = [
        [
          'comment',
          {
            parent_author: '',
            parent_permlink: parentPermlink,
            author,
            permlink: safePermlink,
            title,
            body,
            json_metadata: JSON.stringify(jsonMetadata),
          },
        ],
      ];
      
      await sendHiveOperation(encryptedPrivateKey, operations);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
      throw error;
    }
  };

  return (
    <>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowForm(true);
          setTimeout(() => resetForm(), 100);
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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-0 pt-4 sm:pt-0 pb-0 sm:p-4" style={{ pointerEvents: isMounted ? 'auto' : 'none' }}>
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => {
              if (!loading) {
                resetForm();
                setShowForm(false);
              } else if (confirm('Deseja cancelar a operação em andamento?')) {
                setLoading(false);
                setError('');
                resetForm();
                setShowForm(false);
              }
            }}
          />

          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-6xl max-h-[98vh] overflow-y-auto border border-gray-700 flex flex-col m-2 sm:m-0" style={{ pointerEvents: 'auto' }}>
            {/* Overlay temporário para prevenir hovers indesejados */}
            {!isMounted && (
              <div className="absolute inset-0 z-50 bg-transparent" style={{ pointerEvents: 'all' }} />
            )}
            
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
                    resetForm();
                    setShowForm(false);
                    return;
                  }
                  if (confirm('Deseja cancelar a operação em andamento?')) {
                    setLoading(false);
                    setError('');
                    resetForm();
                    setShowForm(false);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
            ) : loadingPost ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-400">Carregando post...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" style={{ pointerEvents: isMounted ? 'auto' : 'none' }}>
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
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    required
                  />
                </div>

                {/* Mídias do post */}
                <div>
                  <MediaUploader
                    onMediaSelected={handleMediaSelected}
                    onMediaRemoved={handleMediaRemoved}
                    files={files}
                    previews={previews}
                    uploadProgress={uploadProgress}
                    thumbnailIndex={thumbnailIndex}
                    onThumbnailChange={handleThumbnailChange}
                  />
                </div>

                {/* Conteúdo e Preview */}
                <div>
                  <div className="mb-3 bg-gradient-to-r from-green-900/30 to-purple-900/30 border border-green-600/50 rounded-lg p-3 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        <strong className="text-green-400">Precisa de ajuda?</strong> Use os botões da toolbar para formatar automaticamente ou clique no botão <strong className="text-purple-400">&quot;Ajuda&quot;</strong> para ver exemplos completos de Markdown!
                      </p>
                    </div>
                  </div>
                  <PostContentEditorPreview
                    content={content}
                    onChange={value => {
                      const sync = mediaContentSync;
                      sync.handleContentChange(value);
                    }}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    🏷️ Tags *
                  </label>
                  
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
                          const newTag = tagInput
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9\-]/g, '');
                          if (
                            newTag &&
                            !tags.includes(newTag) &&
                            tags.length < 10 &&
                            newTag.length <= 24
                          ) {
                            setTags([...tags, newTag]);
                          }
                          setTagInput('');
                        } else if (
                          e.key === 'Backspace' &&
                          !tagInput &&
                          tags.length > 0
                        ) {
                          setTags(tags.slice(0, -1));
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Digite uma tag e pressione Enter..."
                      maxLength={24}
                      disabled={tags.length >= 10}
                    />
                    {tagInput.trim() && (
                      <button
                        type="button"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        onClick={() => {
                          const newTag = tagInput
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9\-]/g, '');
                          if (
                            newTag &&
                            !tags.includes(newTag) &&
                            tags.length < 10 &&
                            newTag.length <= 24
                          ) {
                            setTags([...tags, newTag]);
                            setTagInput('');
                          }
                        }}
                      >
                        Adicionar
                      </button>
                    )}
                  </div>

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

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(false);
                      setError('');
                      resetForm();
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

