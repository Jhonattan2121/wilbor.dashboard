'use client';

import { uploadFileToIPFS } from '@/utils/ipfs';
import { Client, PrivateKey, type Operation } from '@hiveio/dhive';
import { useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';

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
    onPostSuccess
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
    // Token de Gateway do Pinata
    const PINATA_GATEWAY_TOKEN = 'Z787oWC-YVuVKNuRKECMTklkNYMENXXPYROAr7NUSDnVREVJKbMbQQEenpu3KTam';


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

    const getIpfsGatewayUrl = (hash: string, fileName?: string): string => {
        return `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
    };

    const getIpfsPublicUrl = (hash: string, fileName?: string): string => {
        return `https://ipfs.io/ipfs/${hash}`;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
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
                let fileName = '';
                if (file.name && ext) {
                    fileName = file.name;
                } else if (ext) {
                    fileName = `image-${i + 1}.${ext}`;
                } else {
                    fileName = `image-${i + 1}`;
                }
                const ipfsUrl = getIpfsGatewayUrl(result.IpfsHash, fileName);
                setContent(prev => {
                    let texto = prev.trim();
                    if (texto.length > 0) {
                        texto += `\n\n![image](${ipfsUrl})\n`;
                    } else {
                        texto = `![image](${ipfsUrl})\n`;
                    }
                    return texto;
                });
            } catch (err) {
                setError('Erro ao enviar imagem para o IPFS.');
            } finally {
                setLoading(false);
            }
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...files];
        const newPreviews = [...previews];
        const newProgress = [...uploadProgress];

        URL.revokeObjectURL(newPreviews[index]);

        // Remover a imagem do conteúdo do post, procurando a URL dela
        if (newFiles[index]) {
            const urlToRemove = previews[index];
            setContent(prevContent => {
                const previewUrl = urlToRemove;
                const ipfsPattern = new RegExp(`!\\[image\\]\\(https://lime-useful-snake-714\\.mypinata\\.cloud/ipfs/[^\\)]*\\)\\n?`, 'g');
                const blobPattern = new RegExp(`!\\[image\\]\\(${previewUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n?`, 'g');
                return prevContent.replace(ipfsPattern, '').replace(blobPattern, '').trim();
            });
        }

        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);
        newProgress.splice(index, 1);

        setFiles(newFiles);
        setPreviews(newPreviews);
        setUploadProgress(newProgress);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title) {
            setError('Por favor, insira um título');
            return;
        }

        if (files.length === 0) {
            setError('Por favor, selecione pelo menos uma imagem');
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
                const ipfsUrl = getIpfsPublicUrl(result.IpfsHash, fileName);
                imagesMarkdown += `![image](${ipfsUrl})\n\n`;
            });

            let newContent = content.trim();
            newContent = newContent.replace(/https:\/\/lime-useful-snake-714\.mypinata\.cloud\/ipfs\/([a-zA-Z0-9]+)[^\)]*/g, (match, hash) => {
                return `https://ipfs.io/ipfs/${hash}`;
            });
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
            const parentPermlink = initialCommunity || tagArray[0];
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
                Criar post com Pinata IPFS
            </button>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
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

                    <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                Criar Post com IPFS
                            </h2>
                            <button
                                className="text-gray-400 hover:text-white"
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
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="image-upload-btn"
                                        />
                                    </div>
                                    <textarea
                                        value={content}
                                        onChange={(e) => {
                                            const newContent = e.target.value;
                                            setContent(newContent);
                                            
                                            // Se o conteúdo for apagado completamente, limpar todas as imagens
                                            if (newContent.trim() === '') {
                                                previews.forEach(preview => {
                                                    // Apenas revogar as URLs blob, não as URLs do IPFS
                                                    if (preview.startsWith('blob:')) {
                                                        URL.revokeObjectURL(preview);
                                                    }
                                                });
                                                setFiles([]);
                                                setPreviews([]);
                                                setUploadProgress([]);
                                            } else {
                                                // Verificar se houve uma restauração com Ctrl+Z ou cola
                                                // Extrair todas as URLs de imagens do conteúdo
                                                const ipfsUrlMatches = newContent.match(/!\[image\]\(https:\/\/lime-useful-snake-714\.mypinata\.cloud\/ipfs\/[^)]*\)/g) || [];
                                                
                                                // Se houver URLs no texto, mas poucas ou nenhuma imagem no preview, sincronizar
                                                if (ipfsUrlMatches.length > 0 && ipfsUrlMatches.length !== previews.length) {
                                                    console.log('Restaurando imagens do conteúdo', ipfsUrlMatches.length);
                                                    
                                                    // Extrair as URLs reais das imagens do texto
                                                    const extractedUrls = ipfsUrlMatches.map(match => {
                                                        const urlMatch = match.match(/\(([^)]+)\)/);
                                                        return urlMatch ? urlMatch[1] : '';
                                                    }).filter(url => url !== '');
                                                    
                                                    // Definir todos como 100% concluídos
                                                    const placeholderProgress = extractedUrls.map(() => 100);
                                                    
                                                    // Criar arquivos vazios como marcadores (não serão enviados)
                                                    const placeholderFiles = extractedUrls.map(() => new File([], 'placeholder'));
                                                    
                                                    setFiles(placeholderFiles);
                                                    setPreviews(extractedUrls);
                                                    setUploadProgress(placeholderProgress);
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white min-h-[500px] resize-y"
                                        placeholder="Digite algum conteúdo para o seu post (suporta markdown)"
                                    />
                                </div>

                                {/* Tags estilo PeakD */}
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tags.map((tag, idx) => (
                                            <span key={tag + idx} className="flex items-center bg-gray-700 text-white rounded-full px-3 py-1 text-xs">
                                                #{tag}
                                                <button
                                                    type="button"
                                                    className="ml-2 text-gray-300 hover:text-red-400 focus:outline-none"
                                                    onClick={() => setTags(tags.filter((t, i) => i !== idx))}
                                                    aria-label={`Remover tag ${tag}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => {
                                            if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && tagInput.trim()) {
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
                                        className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                                        placeholder="Digite e pressione Enter para adicionar"
                                        maxLength={24}
                                        disabled={tags.length >= 10}
                                    />
                                  
                                </div>

                                {previews.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-300">Imagens do post</label>
                                            <p className="text-xs text-gray-400">Clique na imagem para defini-la como thumbnail</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {previews.map((preview, index) => (
                                                <div 
                                                    key={index} 
                                                    className={`relative group cursor-pointer border-2 ${thumbnailIndex === index ? 'border-green-500' : 'border-transparent'} rounded-lg`}
                                                    onClick={() => setThumbnailIndex(index)}
                                                >
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg"
                                                    />
                                                    {thumbnailIndex === index && (
                                                        <div className="absolute top-2 left-2 bg-green-600 text-white rounded-full p-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {uploadProgress[index] > 0 && uploadProgress[index] < 100 && (
                                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                            <div className="h-2 w-3/4 bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-blue-500"
                                                                    style={{ width: `${uploadProgress[index]}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="absolute top-1 right-1 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Evita que o clique para remover também selecione a imagem
                                                            removeFile(index);
                                                            // Se a thumbnail for removida, redefine para a primeira imagem
                                                            if (thumbnailIndex === index) {
                                                                setThumbnailIndex(0);
                                                            } else if (thumbnailIndex > index) {
                                                                // Ajusta o índice se uma imagem anterior for removida
                                                                setThumbnailIndex(thumbnailIndex - 1);
                                                            }
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-800 bg-opacity-30 border border-red-600 text-red-400 p-4 rounded">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLoading(false);
                                            setError('');
                                            resetForm();
                                            setShowForm(false);
                                        }}
                                        className="px-4 py-2 rounded text-gray-300 hover:bg-gray-700 mr-2"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className={`px-4 py-2 rounded text-white ${loading ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`}
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