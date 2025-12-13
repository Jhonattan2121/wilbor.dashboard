'use client';

import { uploadFileToIPFS } from '@/utils/ipfs';
import { type Operation } from '@hiveio/dhive';
import { useCallback, useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';
import PostContentEditorPreview from '../../src/components/PostContentEditorPreview';
import { useMediaContentSync } from './MediaContentSync';
import MediaUploader from './MediaUploader';

interface EditPostButtonProps {
  username: string;
  postingKey?: string;
  permlink: string;
  author: string;
  initialTitle: string;
  initialContent: string;
  initialTags: string[];
  initialImages: string[];
}

export default function EditPostButton({
  username,
  postingKey,
  permlink,
  author,
  initialTitle,
  initialContent,
  initialTags,
  initialImages,
}: EditPostButtonProps) {
  const [showForm, setShowForm] = useState(false);
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

  // Token de Gateway do Pinata
  const PINATA_GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN;

  // Usar o hook de sincronização de mídia e conteúdo
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
    // Verificação básica
    if (!pl) return `post-${Date.now().toString(36)}`;
    
    console.log('Analisando permlink:', pl.substring(0, 50) + (pl.length > 50 ? '...' : ''), 'Tamanho:', pl.length);
    
    // Tentar detectar se o permlink é um JSON (caso específico)
    try {
      if (pl.startsWith('{') && pl.includes('"') && pl.includes(':')) {
        const parsed = JSON.parse(pl);
        console.error('ERRO CRÍTICO: Permlink contém um objeto JSON!', parsed);
        return `fixed-permlink-${Date.now().toString(36)}`;
      }
    } catch {
      // Não é JSON válido, continua a verificação
    }
    
    // Verificar se o permlink contém caracteres inválidos ou é muito longo
    if (pl.length > 200 || pl.includes('{') || pl.includes('"') || 
        pl.includes('http') || pl.includes('https') || pl.includes('[') ||
        pl.includes('\\') || pl.includes('/')) {
      
      console.warn('Permlink inválido detectado, criando novo permlink seguro');
      
      // Tenta extrair apenas caracteres alfanuméricos ou hifens válidos
      const cleanedPart = pl.replace(/[^a-z0-9\-]/g, '');
      
      // Se a parte limpa for longa o suficiente, usa uma versão truncada dela
      if (cleanedPart && cleanedPart.length >= 5) {
        const safePart = cleanedPart.substring(0, 100);
        console.log('Permlink limpo e truncado:', safePart);
        return safePart;
      }
      
      // Se não for possível extrair uma parte válida, gera novo baseado no timestamp
      const timestamp = Date.now().toString(36);
      const newPermlink = `post-${timestamp}`;
      console.log('Permlink gerado automaticamente:', newPermlink);
      return newPermlink;
    }

    // Para permalinks normais, apenas garante o limite de tamanho
    if (pl.length > 250) {
      return pl.substring(0, 250);
    }
    
    return pl;
  };

  // Corrigir loop infinito no useEffect
  useEffect(() => {
    if (!loading && error && error.includes('cancelada')) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  // Garantir que o reset do formulário não cause loops
  const resetForm = useCallback(() => {
    setTitle(initialTitle || '');
    setContent(initialContent || '');
    setTags(initialTags || []);
    setTagInput('');
    setFiles([]);
    setPreviews(initialImages?.length ? initialImages.map((url) => url) : []);
    setUploadProgress(
      initialImages?.length ? Array(initialImages.length).fill(100) : [],
    );
    setError('');
    setSuccess(false);
    // Sempre reiniciar com a primeira imagem como thumbnail
    setThumbnailIndex(0);
    
    // Debug para verificar valores iniciais das tags
    console.log('Reset do formulário feito, tags inicializadas:', initialTags || []);
  }, [initialTitle, initialContent, initialTags, initialImages, setThumbnailIndex]);

  // Garantir que os estados sejam atualizados quando o modal é aberto
  useEffect(() => {
    if (showForm) {
      resetForm();
    }
  }, [showForm, resetForm]);

  
  // Sincronizar o estado do formulário quando o modal é aberto
  useEffect(() => {
    if (showForm) {
      resetForm();
      console.log('Modal aberto, tags inicializadas:', initialTags);
    }
  }, [showForm, resetForm, initialTags]);

  // Função para buscar post do Hive por autor e permlink
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
    // URL do Pinata com o token de gateway incluído
    return `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
  };

  // Função para processar e fazer upload dos arquivos selecionados
  const handleMediaSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    console.log('Arquivos selecionados:', selectedFiles.map(f => ({
      nome: f.name,
      tipo: f.type,
      tamanho: f.size,
    })));

    // Criar URLs de objeto para os arquivos selecionados para preview
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    console.log('URLs de preview criadas:', newPreviews);

    // Adicionar os novos previews à lista existente
    setPreviews(prevPreviews => {
      const updatedPreviews = [...prevPreviews, ...newPreviews];
      console.log('Lista atualizada de previews:', updatedPreviews);
      return updatedPreviews;
    });

    // Adicionar os novos arquivos à lista existente
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);

    // Inicializar o progresso de upload para cada novo arquivo
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

    // Processar cada arquivo selecionado
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        setLoading(true);
        // Fazer upload do arquivo para IPFS
        const result = await uploadFileToIPFS(file);
        const ext = getFileExtension(file);
        const isVideo = file.type.startsWith('video/');
        const fileName = file.name && ext
          ? file.name
          : ext
            ? `media-${i + 1}.${ext}`
            : `media-${i + 1}`;
        // Usar o gateway customizado da Pinata com token
        const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);
        console.log('Adicionando mídia ao conteúdo:', { ipfsUrl, isVideo, fileName });

        // Atualizar o conteúdo do post com o novo arquivo
        setContent(prev => {
          let texto = prev.trim();
          if (texto.length > 0) {
            if (isVideo) {
              // Formato correto para vídeo em markdown/HTML
              texto += `\n\n<video width="100%" controls src="${ipfsUrl}"></video>\n`;
            } else {
              texto += `\n\n![image](${ipfsUrl})\n`;
            }
          } else {
            if (isVideo) {
              // Formato correto para vídeo em markdown/HTML
              texto = `<video width="100%" controls src="${ipfsUrl}"></video>\n`;
            } else {
              texto = `![image](${ipfsUrl})\n`;
            }
          }
          return texto;
        });
      } catch (err) {
        console.error('Erro ao enviar imagem para IPFS:', err);
        setError('Erro ao enviar imagem para o IPFS.');

        // Remover a preview que não teve sucesso no upload
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

  // Função para remover um arquivo da lista
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

  // Função utilitária para extrair links de imagens e vídeos do markdown
  const extractMediaLinksFromMarkdown = (markdown: string) => {
    console.log('Extraindo mídia do markdown:', markdown.substring(0, 200));
    // Regex pega o link completo, incluindo parâmetros (corrigido para não cortar ? ou #)
    const imageRegex = /!\[.*?\]\((https?:\/\/[^)\s]+)\)/g;
    // Regex para capturar vídeos no formato <video src=""> (formato principal usado)
    const videoRegex = /<video[^>]*src=["']([^"'>\s]+)["'][^>]*>/g;
    const images: string[] = [];
    const videos: string[] = [];
    let match;
    
    // Capturar imagens
    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push(match[1]); // link completo, com token e parâmetros
    }
    
    // Capturar vídeos
    while ((match = videoRegex.exec(markdown)) !== null) {
      videos.push(match[1]);
    }
    
    console.log('Mídia extraída:', { images: images.length, videos: videos.length });
    return { images, videos };
  };

  // Processar o envio do formulário de edição
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError("Por favor, insira um título");
      return;
    }
    if (!postingKey && !(window as any).hive_keychain) {
      setError(
        "Chave de postagem não fornecida ou Hive Keychain não instalado",
      );
      return;
    }
    if (username.toLowerCase() !== author.toLowerCase()) {
      setError("Você não tem permissão para editar este post");
      return;
    }
    setLoading(true);
    setError("");
    if (!permlink) {
      setError("Permlink não fornecido.");
      setLoading(false);
      return;
    }
    const safePermlink = ensureSafePermlink(permlink);
    const keychainTimeout = setTimeout(() => {
      setLoading(false);
      setError(
        "Operação expirada ou não confirmada no Keychain. Tente novamente.",
      );
    }, 15000);
    try {
      // Upload de novos arquivos e INSERÇÃO no conteúdo (como já faz)
      const ipfsResults = [];
      // Só faz upload de arquivos realmente novos (não placeholders)
      const newFiles = files.filter(f => f.size > 0 && f.name !== 'placeholder');
      let newContent = content.trim();
      for (let i = 0; i < newFiles.length; i++) {
        try {
          const result = await uploadFileToIPFS(newFiles[i]);
          ipfsResults.push(result);
          const ext = getFileExtension(newFiles[i]);
          const isVideo = newFiles[i].type.startsWith('video/');
          const fileName = newFiles[i].name && ext
            ? newFiles[i].name
            : ext
              ? `media-${i + 1}.${ext}`
              : `media-${i + 1}`;
          const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);
          // Só insere se o link ainda não existe no markdown
          if (!newContent.includes(ipfsUrl)) {
            newContent += isVideo
              ? `\n\n<video width="100%" controls src="${ipfsUrl}"></video>\n`
              : `\n\n![image](${ipfsUrl})\n`;
          }
          // Atualizar progresso
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
      // Limpa arquivos após upload para evitar duplicidade futura
      // O conteúdo do post é exatamente o do textarea (com possíveis novas mídias)
      const postBody = newContent;
      // Extrai as mídias do markdown para o metadata
      const { images, videos } = extractMediaLinksFromMarkdown(postBody);
      // Thumbnail: índice da imagem no array extraído
      let orderedImages = images;
      if (thumbnailIndex >= 0 && thumbnailIndex < images.length) {
        const thumb = orderedImages[thumbnailIndex];
        orderedImages = [thumb, ...orderedImages.filter((img, idx) => idx !== thumbnailIndex)];
      }
      const tagArray = tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag !== "");
      const jsonMetadata = {
        tags: tagArray,
        image: orderedImages,
        video: videos,
        app: "wilbor.art/dashboard",
      };
      // Buscar parent_permlink
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
        // Erro ao buscar o post original - continua
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
            setError("Operação cancelada pelo usuário");
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
        throw new Error("Falha ao atualizar o post");
      }
      clearTimeout(keychainTimeout);
      setSuccess(true);
      setTimeout(() => {
        setShowForm(false);
        window.location.reload();
      }, 2000);
      // Após submit, reconstrói files/previews APENAS a partir dos links do markdown
      const { images: extractedImages, videos: extractedVideos } = extractMediaLinksFromMarkdown(postBody);
      const extractedUrls = [...extractedImages, ...extractedVideos];
      const placeholderProgress = extractedUrls.map(() => 100);
      const placeholderFiles = extractedUrls.map(() => new File([], 'placeholder'));
      setFiles(placeholderFiles);
      setPreviews(extractedUrls);
      setUploadProgress(placeholderProgress);
    } catch (error: any) {
      clearTimeout(keychainTimeout);
      setError(
        "Falha ao atualizar o post: " + (error.message || "Erro desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  };



  const updateHivePostWithKeychain = (
    author: string,
    title: string,
    body: string,
    permlink: string,
    parentPermlink: string, // Adicionado esse parâmetro para compatibilidade
    jsonMetadata: any,
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !(window as any).hive_keychain) {
        reject(new Error("Hive Keychain não está instalado"));
        return;
      }

      // O permlink já deve ter sido truncado no handleSubmit, mas garantimos novamente
      const safePermlink = permlink && permlink.length > 250 
        ? permlink.substring(0, 250) 
        : permlink;
      
      console.log('Usando permlink seguro em updateHivePostWithKeychain:', 
        safePermlink, 
        'Tamanho:', 
        safePermlink?.length);
      
      // Criar a operação para o formato usado pelo PeakD (formato baseado em operations)
      const operations: [string, any][] = [[
        'comment',
        {
          parent_author: '',
          parent_permlink: parentPermlink,
          author,
          permlink: safePermlink, // Usar o permlink seguro
          title,
          body,
          json_metadata: JSON.stringify(jsonMetadata),
        }
      ]];
      // Usando formato de operations para transmitir via Keychain
      console.log("Tentando editar post no Hive usando formato de operations via Keychain:", operations);
      (window as any).hive_keychain.requestBroadcast(
        author,
        operations,
        'Posting',
        (response: any) => {
          console.log("Resposta do Hive Keychain (edição):", response);

          if (response.success) {
            resolve(true);
          } else {
            if (
              response.error === "user_cancel" ||
              response.message?.toLowerCase().includes("cancel") ||
              response.message?.toLowerCase().includes("cancelado") ||
              response.message?.toLowerCase().includes("rejected") ||
              response.message?.toLowerCase().includes("rejeitado") ||
              response.error === "declined"
            ) {
              const cancelError = new Error("Operação cancelada pelo usuário");
              (cancelError as any).isCancelled = true;
              reject(cancelError);
            } else {
              const errorMsg = response.message || "Erro ao atualizar com Keychain";
              // Verificar se o erro é relacionado ao tamanho do permlink
              if (errorMsg.toLowerCase().includes('permlink is too long') || 
                  errorMsg.toLowerCase().includes('permlink muito longo')) {
                const permlinkError = new Error(`Erro: Permlink muito longo. Por favor, tente novamente com um título mais curto ou entre em contato com o suporte.`);
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

  // Nova função simplificada que usa sendHiveOperation do servidor
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
          }
        ]
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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          resetForm(); // Resetar o formulário ao abrir o modal
          setShowForm(true);
        }}
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        Editar
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-0 pt-4 sm:pt-0 pb-0 sm:p-4">
          {/* Fundo escuro/transparente */}
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

          {/* Modal do formulário de edição - Versão melhorada para desktop e mobile */}
          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-4 sm:p-8 w-full max-w-5xl max-h-[98vh] overflow-y-auto border border-gray-700 flex flex-col m-2 sm:m-0">
            <div className="flex justify-between items-center mb-4 pt-1 pb-2">
              <h2 className="text-lg sm:text-xl font-bold">Editar Post</h2>
              <button
                className="text-gray-400 hover:text-white p-2 -mr-2"
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
              <div className="bg-green-800 bg-opacity-30 border border-green-600 text-green-400 p-4 rounded mb-4">
                Post atualizado com sucesso! Recarregando a página...
              </div>
            ) : loadingPost ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-400">Carregando post...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Título do Post
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                    placeholder="Digite o título do seu post"
                  />
                </div>

                {/* Mídias do post - sempre acima do conteúdo */}
                <div className="mb-2">
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

                {/* Conteúdo e Preview lado a lado */}
                <PostContentEditorPreview
                  content={content}
                  onChange={value => {
                    const sync = mediaContentSync;
                    sync.handleContentChange(value);
                  }}
                />

                {/* Tags estilo chip com rolagem horizontal no mobile */}
                <div>
                  <label className="block text-sm font-medium mb-1">Tags</label>
                  <div
                    className="flex overflow-x-auto flex-nowrap gap-2 mb-2 pb-1 hide-scrollbar sm:flex-wrap sm:overflow-visible sm:gap-2"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {tags.map((tag, idx) => (
                      <span
                        key={tag + idx}
                        className="flex-shrink-0 flex items-center bg-gray-700 text-white rounded-full px-4 py-2 text-sm mr-1 shadow-sm"
                        style={{ fontSize: '0.97rem' }}
                        title={tag}
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-2 text-gray-300 hover:text-red-400 focus:outline-none p-1 text-base"
                          onClick={() => setTags(tags.filter((t, i) => i !== idx))}
                          aria-label={`Remover tag ${tag}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
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
                      className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-base"
                      placeholder="Digite e pressione Enter para adicionar"
                      maxLength={24}
                      disabled={tags.length >= 10}
                      style={{ fontSize: '1rem' }}
                    />
                    {tagInput.trim() && (
                      <button
                        type="button"
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap"
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
                  <div className="text-xs text-gray-400 mt-1">
                    {tags.length}/10 tags • Clique Enter para adicionar ou Delete para remover
                  </div>
                </div>

                {/* Mensagem de erro */}
                {error && (
                  <div className="bg-red-800 bg-opacity-30 border border-red-600 text-red-400 p-4 rounded">
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-2 mt-4 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(false);
                      setError('');
                      resetForm();
                      setShowForm(false);
                    }}
                    className="px-4 py-3 sm:py-2 rounded text-gray-300 hover:bg-gray-700 \
                      border border-gray-700 order-2 sm:order-1 sm:mr-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-3 sm:py-2 rounded text-white \
                      ${loading ? 'bg-green-800' : 'bg-green-600 hover:bg-green-700'} \
                      order-1 sm:order-2`}
                    disabled={loading}
                  >
                    {loading ? 'Atualizando...' : 'Atualizar Post'}
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
