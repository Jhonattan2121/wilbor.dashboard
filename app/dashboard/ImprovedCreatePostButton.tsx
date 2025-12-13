'use client';

import { uploadFileToIPFS } from '@/utils/ipfs';
import { type Operation } from '@hiveio/dhive';
import { useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';
import PostContentEditorPreview from '../../src/components/PostContentEditorPreview';
import TagSuggestions from '../../src/components/TagSuggestions';
import { useDraftSaver } from '../../src/hooks/useDraftSaver';
import MediaUploader from './MediaUploader';
import { useMediaContentSync } from './MediaContentSync';

interface ImprovedCreatePostButtonProps {
  username: string;
  postingKey?: string;
  initialCommunity?: string;
  onPostSuccess?: () => void;
}

export default function ImprovedCreatePostButton({
  username,
  postingKey,
  initialCommunity,
  onPostSuccess,
}: ImprovedCreatePostButtonProps) {
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
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);
  const [showDraftAlert, setShowDraftAlert] = useState(false);

  // Sistema de rascunhos
  const {
    saveDraft,
    loadDraft,
    deleteDraft,
    hasDraft,
    lastSaved,
  } = useDraftSaver({
    title,
    content,
    tags,
    draftKey: `hive-post-draft-${username}`,
    autoSaveInterval: 30000, // Auto-save a cada 30 segundos
  });

  // Verificar se há rascunho ao abrir o modal
  useEffect(() => {
    if (showForm && hasDraft) {
      setShowDraftAlert(true);
    }
  }, [showForm, hasDraft]);

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

  // Função para resetar todos os campos do formulário
  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
    setFiles([]);
    setPreviews([]);
    setUploadProgress([]);
    setError('');
    setSuccess(false);
    setThumbnailIndex(0);
  };

  // Carregar rascunho
  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setTags(draft.tags || []);
      setShowDraftAlert(false);
    }
  };

  // Descartar rascunho
  const handleDiscardDraft = () => {
    deleteDraft();
    setShowDraftAlert(false);
  };

  useEffect(() => {
    if (!loading && error && error.includes('cancelada')) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  const getIpfsGatewayUrl = (hash: string, _fileName?: string): string => {
    const url = `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
    return url;
  };

  const getIpfsPublicUrl = (hash: string, _fileName?: string): string => {
    const url = `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
    return url;
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
        const result = await uploadFileToIPFS(file);
        const ext = getFileExtension(file);
        const isVideo = file.type.startsWith('video/');
        let fileName = file.name || `media-${i + 1}${ext ? '.' + ext : ''}`;
        const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);

        setContent(prev => {
          let texto = prev.trim();
          const mediaMarkdown = isVideo
            ? `<video width="100%" controls src="${ipfsUrl}"></video>`
            : `![image](${ipfsUrl})`;
          
          return texto.length > 0 ? `${texto}\n\n${mediaMarkdown}\n` : `${mediaMarkdown}\n`;
        });
      } catch (err) {
        console.error('Erro ao enviar mídia para IPFS:', err);
        setError('Erro ao enviar mídia para o IPFS.');

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

    setLoading(true);
    setError('');

    const keychainTimeout = setTimeout(() => {
      setLoading(false);
      setError('Operação expirada ou não confirmada no Keychain. Tente novamente.');
    }, 15000);

    try {
      const ipfsResults = [];
      for (let i = 0; i < files.length; i++) {
        try {
          const result = await uploadFileToIPFS(files[i]);
          ipfsResults.push(result);

          const newProgress = [...uploadProgress];
          newProgress[i] = 100;
          setUploadProgress(newProgress);
        } catch (error) {
          console.error(`Erro ao fazer upload do arquivo ${i}:`, error);
          setError(`Falha ao fazer upload da mídia ${i + 1}`);
          setLoading(false);
          clearTimeout(keychainTimeout);
          return;
        }
      }

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

      let imagesMarkdown = '';
      ipfsResults.forEach((result, index) => {
        const file = files[index];
        const ext = getFileExtension(file);
        let fileName = file.name || `image-${index + 1}${ext ? '.' + ext : ''}`;
        const ipfsUrl = getIpfsPublicUrl(result.IpfsHash, fileName);
        
        if (file.type && file.type.startsWith('video/')) {
          imagesMarkdown += `<video width="100%" controls src="${ipfsUrl}"></video>\n\n`;
        } else {
          imagesMarkdown += `![image](${ipfsUrl})\n\n`;
        }
      });

      let newContent = content.trim();
      if (imagesMarkdown.trim().length > 0) {
        newContent = newContent.length > 0 ? newContent + '\n\n' + imagesMarkdown : imagesMarkdown;
      }

      const postBody = newContent;
      const tagArray = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');
      
      const allImages = ipfsResults.map((result, index) => {
        const file = files[index];
        const ext = getFileExtension(file);
        let fileName = file.name || `image-${index + 1}${ext ? '.' + ext : ''}`;
        return getIpfsPublicUrl(result.IpfsHash, fileName);
      });

      // Reordenar as imagens para colocar a thumbnail selecionada primeiro
      const orderedImages = [...allImages];
      if (thumbnailIndex >= 0 && thumbnailIndex < allImages.length) {
        const thumbnail = orderedImages[thumbnailIndex];
        orderedImages.splice(thumbnailIndex, 1);
        orderedImages.unshift(thumbnail);
      }

      const jsonMetadata = {
        tags: tagArray,
        image: orderedImages,
        app: 'wilbor.art/dashboard',
      };

      const parentPermlink = initialCommunity || tags[0] || 'blog';
      const permlink = createPermlink(title);
      const operations: Operation[] = [
        [
          'comment',
          {
            parent_author: '',
            parent_permlink: parentPermlink,
            author: username,
            permlink,
            title,
            body: postBody,
            json_metadata: JSON.stringify(jsonMetadata),
          }
        ]
      ];

      let postSuccess = false;
      if (postingKey) {
        postSuccess = await postToHiveWithKey(operations, postingKey);
      } else {
        try {
          postSuccess = await postToHiveWithKeychain(operations, username);
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

      if (!postSuccess) {
        clearTimeout(keychainTimeout);
        throw new Error('Falha ao publicar o post');
      }

      clearTimeout(keychainTimeout);
      setSuccess(true);
      
      // Deletar rascunho após publicação bem-sucedida
      deleteDraft();
      
      setTimeout(() => {
        resetForm();
        setShowForm(false);
        if (onPostSuccess) {
          onPostSuccess();
        }
      }, 2000);
    } catch (error: any) {
      clearTimeout(keychainTimeout);
      console.error('Erro ao criar post:', error);
      setError('Falha ao criar o post: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const postToHiveWithKey = async (
    operations: Operation[],
    encryptedPrivateKey: string
  ) => {
    try {
      await sendHiveOperation(encryptedPrivateKey, operations);
      return true;
    } catch (error) {
      console.error('Erro ao postar no Hive:', error);
      throw new Error('Falha ao publicar no Hive');
    }
  };

  const postToHiveWithKeychain = (
    operations: Operation[],
    username: string
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
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
              response.message?.toLowerCase().includes('cancelado') ||
              response.message?.toLowerCase().includes('rejected') ||
              response.message?.toLowerCase().includes('rejeitado') ||
              response.error === 'declined'
            ) {
              const cancelError = new Error('Operação cancelada pelo usuário');
              (cancelError as any).isCancelled = true;
              reject(cancelError);
            } else {
              reject(new Error(response.message || 'Erro ao postar com Keychain'));
            }
          }
        },
      );
    });
  };

  const createPermlink = (title: string): string => {
    const date = new Date();
    const dateString = date.toISOString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    let permlink = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 40);

    permlink = `${permlink}-${dateString}`;

    return permlink;
  };

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">Criar Post</span>
      </button>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-0 pt-4 sm:pt-0 pb-0 sm:p-4 overscroll-contain">
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

          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-700 flex flex-col m-2 sm:m-0">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-1 pb-2 border-b border-gray-700">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  ✍️ Criar Novo Post
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Use o editor avançado para criar conteúdo incrível
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-white p-2 -mr-2 transition-colors"
                onClick={() => {
                  if (!loading) {
                    if (confirm('Deseja fechar? Seu progresso será salvo como rascunho.')) {
                      saveDraft();
                      resetForm();
                      setShowForm(false);
                    }
                    return;
                  }
                  if (confirm("Deseja cancelar a operação em andamento?")) {
                    setLoading(false);
                    setError('');
                    resetForm();
                    setShowForm(false);
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Alert de rascunho */}
            {showDraftAlert && (
              <div className="mb-4 bg-blue-900 bg-opacity-30 border border-blue-600 text-blue-300 p-4 rounded-lg flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Rascunho encontrado!</h4>
                  <p className="text-sm mb-3">Você tem um rascunho salvo. Deseja continuar de onde parou?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleLoadDraft}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      Carregar Rascunho
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status de auto-save */}
            {lastSaved && !showDraftAlert && (
              <div className="mb-2 text-xs text-gray-500 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Rascunho salvo às {lastSaved.toLocaleTimeString('pt-BR')}
              </div>
            )}

            {success ? (
              <div className="bg-green-800 bg-opacity-30 border border-green-600 text-green-400 p-4 rounded-lg mb-4 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Post criado com sucesso! Redirecionando...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    📝 Título do Post *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="Digite um título chamativo para seu post..."
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
                        className="flex-shrink-0 flex items-center bg-blue-600 text-white rounded-full px-4 py-2 text-sm shadow-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-2 text-blue-200 hover:text-white focus:outline-none"
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
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite uma tag e pressione Enter..."
                      maxLength={24}
                      disabled={tags.length >= 10}
                    />
                    {tagInput.trim() && (
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      saveDraft();
                      alert('Rascunho salvo com sucesso!');
                    }}
                    className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Salvar Rascunho
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(false);
                        setError('');
                        resetForm();
                        setShowForm(false);
                      }}
                      className="flex-1 sm:flex-none px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 ${
                        loading ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Publicando...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          Publicar no Hive
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}


