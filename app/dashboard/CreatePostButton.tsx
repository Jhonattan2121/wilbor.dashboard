'use client';

import { uploadFileToIPFS } from '@/utils/ipfs';
import { type Operation } from '@hiveio/dhive';
import { useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';
import { useMediaContentSync } from './MediaContentSync';
import MediaUploader from './MediaUploader';
import PostContentEditorPreview from '../../src/components/PostContentEditorPreview';

interface CreatePostButtonProps {
    username: string;
    postingKey?: string;
    initialCommunity?: string;
    onPostSuccess?: () => void;
}

export default function CreatePostButton({
  username,
  postingKey,
  initialCommunity,
  onPostSuccess,
}: CreatePostButtonProps) {
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

  // Token de Gateway do Pinata
  const PINATA_GATEWAY_TOKEN = 
    process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN;

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
    setThumbnailIndex(0); // Redefinir o índice do thumbnail
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
    // Usar seu gateway customizado da Pinata com token
    const url = `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}` +
      `?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
    console.log('IPFS URL gerada:', url);
    return url;
  };

  const getIpfsPublicUrl = (hash: string, _fileName?: string): string => {
    // Usar seu gateway customizado da Pinata com token
    const url = `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}` +
      `?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
    return url;
  };

    // Função para processar e fazer upload dos arquivos selecionados
    const handleMediaSelected = async (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) return;

        console.log('Arquivos selecionados:', selectedFiles.map(f => ({
            nome: f.name,
            tipo: f.type,
            tamanho: f.size
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
                let fileName = '';
                if (file.name && ext) {
                    fileName = file.name;
                } else if (ext) {
                    fileName = `media-${i + 1}.${ext}`;
                } else {
                    fileName = `media-${i + 1}`;
                }
                // Usa sempre o gateway público para exibição
                const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);
                console.log('Adicionando mídia ao conteúdo:', { ipfsUrl, isVideo, fileName });

                // Atualizar o conteúdo do post com o novo arquivo
                setContent(prev => {
                    let texto = prev.trim();
                    if (texto.length > 0) {
                        if (isVideo) {
                            // Formato padronizado para vídeo
                            texto += `\n\n<video width="100%" controls src="${ipfsUrl}"></video>\n`;
                        } else {
                            texto += `\n\n![image](${ipfsUrl})\n`;
                        }
                    } else {
                        if (isVideo) {
                            // Formato padronizado para vídeo
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title) {
            setError('Por favor, insira um título');
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
                    setError(`Falha ao fazer upload da imagem ${i + 1}`);
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
                let fileName = '';
                if (file.name && ext) {
                    fileName = file.name;
                } else if (ext) {
                    fileName = `image-${index + 1}.${ext}`;
                } else {
                    fileName = `image-${index + 1}`;
                }
                // Usa sempre o gateway público para exibição
                const ipfsUrl = getIpfsPublicUrl(result.IpfsHash, fileName);
                if (file.type && file.type.startsWith('video/')) {
                    imagesMarkdown += `<video width="100%" controls src="${ipfsUrl}"></video>\n\n`;
                } else {
                    imagesMarkdown += `![image](${ipfsUrl})\n\n`;
                }
            });

            let newContent = content.trim();
            // Manter URLs do Pinata - não fazer substituição
            if (imagesMarkdown.trim().length > 0) {
                if (newContent.length > 0) {
                    newContent += '\n\n' + imagesMarkdown;
                } else {
                    newContent = imagesMarkdown;
                }
            }

            const postBody = newContent;
            const tagArray = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '');
            // Mapear todas as imagens para URLs
            const allImages = ipfsResults.map((result, index) => {
                const file = files[index];
                const ext = getFileExtension(file);
                let fileName = '';
                if (file.name && ext) {
                    fileName = file.name;
                } else if (ext) {
                    fileName = `image-${index + 1}.${ext}`;
                } else {
                    fileName = `image-${index + 1}`;
                }
                return getIpfsPublicUrl(result.IpfsHash, fileName);
            });

            // Reordenar as imagens para colocar a thumbnail selecionada primeiro
            const orderedImages = [...allImages];
            if (thumbnailIndex >= 0 && thumbnailIndex < allImages.length) {
                // Remove a thumbnail da posição original
                const thumbnail = orderedImages[thumbnailIndex];
                orderedImages.splice(thumbnailIndex, 1);
                // Insere a thumbnail no início do array
                orderedImages.unshift(thumbnail);
            }

            const jsonMetadata = {
                tags: tagArray,
                image: orderedImages,
                app: 'wilbor.art/dashboard',
            };

            // Geração do permlink e operações fora das funções de broadcast
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
                        console.log('Operação cancelada pelo usuário detectada');
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

    // Recebe Operation[] já montado
    const postToHiveWithKey = async (
        operations: Operation[],
        encryptedPrivateKey: string
    ) => {
        try {
            // Usar a função do servidor que descriptografa e envia a operação
            await sendHiveOperation(encryptedPrivateKey, operations);
            return true;
        } catch (error) {
            console.error('Erro ao postar no Hive:', error);
            throw new Error('Falha ao publicar no Hive');
        }
    };

    // Recebe Operation[] já montado
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
                    console.log('Resposta do Hive Keychain:', response);
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                    />
                </svg>
                Criar post
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

                    <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-5xl max-h-[95vh] overflow-y-auto border border-gray-700 flex flex-col m-2 sm:m-0">
                        <div className="flex justify-between items-center mb-4 pt-1 pb-2">
                            <h2 className="text-lg sm:text-xl font-bold">
                                Criar Post com IPFS
                            </h2>
                            <button
                                className="text-gray-400 hover:text-white p-2 -mr-2"
                                onClick={() => {
                                    if (!loading) {
                                        resetForm();
                                        setShowForm(false);
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

                        {success ? (
                            <div className="bg-green-800 bg-opacity-30 border border-green-600 text-green-400 p-4 rounded mb-4">
                                Post criado com sucesso! Redirecionando...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Título do Post</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                                        placeholder="Digite o título do seu post"
                                    />
                                </div>

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
                                    <PostContentEditorPreview
                                        content={content}
                                        onChange={value => {
                                            const sync = mediaContentSync;
                                            sync.handleContentChange(value);
                                        }}
                                    />
                                </div>

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



                                {error && (
                                    <div className="bg-red-800 bg-opacity-30 border border-red-600 text-red-400 p-4 rounded">
                                        {error}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 
                                  sm:gap-2 mt-4 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLoading(false);
                                            setError('');
                                            resetForm();
                                            setShowForm(false);
                                        }}
                                        className="px-4 py-3 sm:py-2 rounded text-gray-300 
                                          hover:bg-gray-700 border border-gray-700 
                                          order-2 sm:order-1 sm:mr-2"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={`px-4 py-3 sm:py-2 rounded text-white 
                                          ${loading ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} 
                                          order-1 sm:order-2`}
                                        disabled={loading}
                                    >
                                        {loading ? 'Publicando...' : 'Publicar no Hive'}
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