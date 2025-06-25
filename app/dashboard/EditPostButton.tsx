"use client";

import { uploadFileToIPFS } from '@/utils/ipfs';
import { Client, PrivateKey, type Operation } from '@hiveio/dhive';
import { useCallback, useEffect, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';

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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [loadingPost, setLoadingPost] = useState(false);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);

  // Token de Gateway do Pinata
  const PINATA_GATEWAY_TOKEN =
    "Z787oWC-YVuVKNuRKECMTklkNYMENXXPYROAr7NUSDnVREVJKbMbQQEenpu3KTam";
    
  // Função para garantir que o permlink esteja dentro do limite permitido
  const ensureSafePermlink = (pl: string): string => {
    // Verificação básica
    if (!pl) return `post-${Date.now().toString(36)}`;
    
    console.log("Analisando permlink:", pl.substring(0, 50) + (pl.length > 50 ? "..." : ""), "Tamanho:", pl.length);
    
    // Tentar detectar se o permlink é um JSON (caso específico)
    try {
      if (pl.startsWith('{') && pl.includes('"') && pl.includes(':')) {
        const parsed = JSON.parse(pl);
        console.error("ERRO CRÍTICO: Permlink contém um objeto JSON!", parsed);
        return `fixed-permlink-${Date.now().toString(36)}`;
      }
    } catch (e) {
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
      
      // Se não for possível extrair uma parte válida, gera um novo baseado no timestamp
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
    if (!loading && error && error.includes("cancelada")) {
      const timer = setTimeout(() => {
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  // Garantir que o reset do formulário não cause loops
  const resetForm = useCallback(() => {
    setTitle(initialTitle || "");
    setContent(initialContent || "");
    setTags(initialTags || []);
    setTagInput("");
    setFiles([]);
    setPreviews(initialImages?.length ? initialImages.map((url) => url) : []);
    setUploadProgress(
      initialImages?.length ? Array(initialImages.length).fill(100) : [],
    );
    setError("");
    setSuccess(false);
    // Sempre reiniciar com a primeira imagem como thumbnail
    setThumbnailIndex(0);
    
    // Debug para verificar valores iniciais das tags
    console.log("Reset do formulário feito, tags inicializadas:", initialTags || []);
  }, [initialTitle, initialContent, initialTags, initialImages, setThumbnailIndex]);

  // Garantir que os estados sejam atualizados quando o modal é aberto
  useEffect(() => {
    if (showForm) {
      resetForm();
    }
  }, [showForm, resetForm]);

  // Não faz mais reset automático ao montar, para evitar loop infinito
  // O reset será feito manualmente ao abrir o modal
  
  // Sincronizar o estado do formulário quando o modal é aberto
  useEffect(() => {
    if (showForm) {
      resetForm();
      console.log("Modal aberto, tags inicializadas:", initialTags);
    }
  }, [showForm, resetForm, initialTags]);

  // Função para buscar post do Hive por autor e permlink
  const fetchPostFromHive = async (
    author: string,
    permlink: string,
  ): Promise<any> => {
    setLoadingPost(true);
    try {
      const response = await fetch("https://api.hive.blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "condenser_api.get_content",
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
      console.error("Erro ao buscar dados do post:", error);
      return null;
    } finally {
      setLoadingPost(false);
    }
  };

  const getIpfsGatewayUrl = (hash: string, fileName?: string): string => {
    // URL do Pinata com o token de gateway incluído
    return `https://lime-useful-snake-714.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${PINATA_GATEWAY_TOKEN}`;
  };

  // Manipular a seleção de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    // Criar URLs de visualização para as imagens selecionadas
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
    setUploadProgress((prev) => [...prev, ...selectedFiles.map(() => 0)]);
  };

  // Remover uma imagem da lista
  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    const newProgress = [...uploadProgress];
    
    // Revogar URL de objeto para evitar vazamento de memória
    URL.revokeObjectURL(newPreviews[index]);

    // Remover a imagem do conteúdo do post, procurando a URL dela
    if (newPreviews[index]) {
      const urlToRemove = newPreviews[index];
      setContent(prevContent => {
        // Regex para encontrar links de imagem no formato Markdown
        const ipfsPattern = new RegExp(`!\\[image\\]\\(https://lime-useful-snake-714\\.mypinata\\.cloud/ipfs/[^\\)]*\\)\\n?`, 'g');
        const ipfsPublicPattern = new RegExp(`!\\[image\\]\\(https://ipfs\\.io/ipfs/[^\\)]*\\)\\n?`, 'g');
        const blobPattern = urlToRemove.startsWith('blob:') 
          ? new RegExp(`!\\[image\\]\\(${urlToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n?`, 'g')
          : null;
        
        // Para URLs do IPFS, tentamos extrair o hash e procurar por ele
        let ipfsHash = '';
        if (urlToRemove.includes('/ipfs/')) {
          const parts = urlToRemove.split('/ipfs/');
          if (parts.length > 1) {
            ipfsHash = parts[1].split('?')[0].split('/')[0];
            if (ipfsHash) {
              const specificIpfsPattern = new RegExp(`!\\[image\\]\\(.*${ipfsHash}[^\\)]*\\)\\n?`, 'g');
              return prevContent.replace(specificIpfsPattern, '').trim();
            }
          }
        }
        
        // Tenta remover usando os padrões gerais
        let cleanedContent = prevContent;
        if (blobPattern) {
          cleanedContent = cleanedContent.replace(blobPattern, '');
        }
        
        return cleanedContent.replace(ipfsPattern, '').replace(ipfsPublicPattern, '').trim();
      });
    }

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    newProgress.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
    setUploadProgress(newProgress);
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

    // Verificar se o usuário é o autor
    if (username.toLowerCase() !== author.toLowerCase()) {
      setError("Você não tem permissão para editar este post");
      return;
    }

    setLoading(true);
    setError("");

    // Verificação rigorosa do permlink
    if (!permlink) {
      setError("Permlink não fornecido.");
      setLoading(false);
      return;
    }

    // Verificar o permlink para garantir que seja válido e não contenha dados incorretos
    const safePermlink = ensureSafePermlink(permlink);
    
    // Log para depuração 
    if (safePermlink !== permlink) {
      console.log("Permlink original:", permlink, "Tamanho:", permlink.length);
      console.log("Permlink seguro:", safePermlink, "Tamanho:", safePermlink.length);
    }

    // Log para depuração
    console.log("Permlink a ser usado:", safePermlink, "Tamanho:", safePermlink.length);

    const keychainTimeout = setTimeout(() => {
      setLoading(false);
      setError(
        "Operação expirada ou não confirmada no Keychain. Tente novamente.",
      );
      // Não fecha o modal automaticamente em caso de erro!
    }, 15000);

    try {
      const ipfsResults = [];
      const existingImagesCount = initialImages?.length || 0;
      const newFiles = files.slice(0);

      for (let i = 0; i < newFiles.length; i++) {
        try {
          const result = await uploadFileToIPFS(newFiles[i]);
          ipfsResults.push(result);

          // Atualizar o progresso
          const newProgress = [...uploadProgress];
          newProgress[existingImagesCount + i] = 100;
          setUploadProgress(newProgress);
        } catch (error) {
          console.error(`Erro ao fazer upload do arquivo ${i}:`, error);
          setError(`Falha ao fazer upload da imagem ${i + 1}`);
          setLoading(false);
          clearTimeout(keychainTimeout);
          return;
        }
      }

      const postBody = content; 

      // Preparar as tags
      const tagArray = tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag !== "");
    
      // Preparar os metadados
      // Reordenar as imagens para colocar a thumbnail primeiro
      const allImages = [
        ...initialImages.filter((url) => previews.includes(url)),
        ...ipfsResults.map((result, index) => {
          const fileName = newFiles[index]?.name || "";
          return getIpfsGatewayUrl(result.IpfsHash, fileName);
        }),
      ];
      
      // Se o índice da thumbnail for válido, coloca a imagem selecionada como a primeira
      const orderedImages = [...allImages];
      if (thumbnailIndex >= 0 && thumbnailIndex < allImages.length) {
        // Remove a thumbnail da lista original
        const thumbnail = orderedImages[thumbnailIndex];
        orderedImages.splice(thumbnailIndex, 1);
        // Insere a thumbnail no início do array
        orderedImages.unshift(thumbnail);
      }
      
      const jsonMetadata = {
        tags: tagArray,
        image: orderedImages,
        app: "wilbor.art/dashboard",
      };

      // Atualizar o post no Hive
      let updateSuccess = false;
      // Buscar o parent_permlink correto do post original
      let parentPermlink = tagArray.length > 0 ? tagArray[0] : '';
      try {
        // Tentamos buscar com o permlink original primeiro
        let originalPost = await fetchPostFromHive(author, permlink);
        
        // Se falhar e o permlink foi modificado, tentamos com o safePermlink
        if (!originalPost && safePermlink !== permlink) {
          console.log('Tentando buscar post com safePermlink');
          originalPost = await fetchPostFromHive(author, safePermlink);
        }
        
        if (originalPost && originalPost.parent_permlink) {
          parentPermlink = originalPost.parent_permlink;
        }
      } catch (e) {
        // Se não conseguir buscar, usa tagArray[0] mesmo
        console.warn('Não foi possível buscar informações do post original, usando tag:', tagArray[0]);
      }
      if (postingKey) {
        // Postar com chave privada criptografada
        updateSuccess = await updateHivePostWithEncryptedKey(
          username,
          title,
          postBody,
          safePermlink, // Usar o permlink seguro
          parentPermlink,
          jsonMetadata,
          postingKey,
        );
      } else {
        // Postar com Keychain
        try {
          updateSuccess = await updateHivePostWithKeychain(
            username,
            title,
            postBody,
            safePermlink, // Usar o permlink seguro
            parentPermlink,
            jsonMetadata,
          );
        } catch (keychainError: any) {
          // Verificar se é um cancelamento do usuário
          if (keychainError.isCancelled === true) {
            console.log("Operação cancelada pelo usuário detectada");
            setError("Operação cancelada pelo usuário");
            setLoading(false);
            clearTimeout(keychainTimeout);
            return;
          }
          clearTimeout(keychainTimeout);
          throw keychainError;
        }
      }

      // Se chegou aqui e updateSuccess é false, algo deu errado
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
    } catch (error: any) {
      clearTimeout(keychainTimeout);
      console.error("Erro ao atualizar post:", error);
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
      console.error("Erro ao atualizar post:", error);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Fundo escuro/transparente */}
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => {
              if (!loading) {
                resetForm();
                setShowForm(false);
              } else if (confirm("Deseja cancelar a operação em andamento?")) {
                setLoading(false);
                setError("");
                resetForm();
                setShowForm(false);
              }
            }}
          />

          {/* Modal do formulário de edição */}
          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Editar Post</h2>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => {
                  // Se não estiver carregando, fecha o formulário normalmente
                  if (!loading) {
                    resetForm();
                    setShowForm(false);
                    return;
                  }
                  // Se estiver carregando, pergunta se deseja cancelar
                  if (confirm("Deseja cancelar a operação em andamento?")) {
                    setLoading(false);
                    setError("");
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

                {/* Conteúdo */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium mb-1">
                      Conteúdo
                    </label>
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
                        // Verificar se imagens foram deletadas manualmente do conteúdo
                        const currentImagePatterns = [
                          /!\[image\]\(https:\/\/lime-useful-snake-714\.mypinata\.cloud\/ipfs\/([^)]*)\)/g,
                          /!\[image\]\(https:\/\/ipfs\.io\/ipfs\/([^)]*)\)/g,
                          /!\[(.*?)\]\(https:\/\/files\.peakd\.com\/file\/([^)]*)\)/g,
                          /!\[.*?\]\(https:\/\/files\.peakd\.com\/file\/peakd-hive\/([^)]*)\)/g
                        ];
                        
                        // Encontrar todas as referências de imagens no texto
                        let allMatches: RegExpMatchArray[] = [];
                        let allHashes: string[] = [];
                        
                        currentImagePatterns.forEach(pattern => {
                          const matches = Array.from(newContent.matchAll(pattern));
                          allMatches = [...allMatches, ...matches];
                          
                          // Extrair os hashes dos links IPFS
                          const hashes = matches.map(match => {
                            const url = match[0];
                            const hashMatch = url.match(/ipfs\/([a-zA-Z0-9]+)/);
                            return hashMatch ? hashMatch[1] : '';
                          }).filter(Boolean) as string[];
                          
                          allHashes = [...allHashes, ...hashes];
                        });
                        
                        // Adicionar também URLs blob do conteúdo
                        const blobMatches = newContent.match(/!\[image\]\(blob:[^)]*\)/g) || [];
                        const blobUrls = blobMatches.map(match => {
                          const urlMatch = match.match(/\((blob:[^)]+)\)/);
                          return urlMatch ? urlMatch[1] : '';
                        }).filter(Boolean);
                        
                        // Verificar se alguma imagem nos previews não está mais no conteúdo
                        if (previews.length > 0) {
                          const newPreviews = [...previews];
                          const newFiles = [...files];
                          const newProgress = [...uploadProgress];
                          let changed = false;
                          
                          // Para cada preview, verificar se ainda está referenciado no conteúdo
                          for (let i = newPreviews.length - 1; i >= 0; i--) {
                            const preview = newPreviews[i];
                            
                            // Se for uma URL blob, verificar se ainda está no conteúdo
                            if (preview.startsWith('blob:')) {
                              if (!blobUrls.includes(preview)) {
                                // Remover a pré-visualização que não está mais no texto
                                URL.revokeObjectURL(preview);
                                newPreviews.splice(i, 1);
                                newFiles.splice(i, 1);
                                newProgress.splice(i, 1);
                                changed = true;
                              }
                            } 
                            // Se for um link IPFS, verificar pelo hash
                            else if (preview.includes('/ipfs/')) {
                              const parts = preview.split('/ipfs/');
                              if (parts.length > 1) {
                                const hash = parts[1].split('?')[0].split('/')[0];
                                if (hash && !allHashes.includes(hash)) {
                                  // Hash não encontrado no conteúdo, remover
                                  newPreviews.splice(i, 1);
                                  newFiles.splice(i, 1);
                                  newProgress.splice(i, 1);
                                  changed = true;
                                }
                              }
                            }
                            // Se for um link do PeakD, verificar se ainda está no conteúdo
                            else if (preview.includes('files.peakd.com')) {
                              // Extrai tanto o nome do arquivo quanto os outros componentes da URL
                              const urlParts = preview.split('/');
                              const fileName = urlParts[urlParts.length - 1].split('?')[0];
                              
                              // Também verifica se há alguma parte identificadora da URL no conteúdo
                              let isReferenced = false;
                              
                              // Verifica se o nome do arquivo ainda está no conteúdo
                              if (newContent.includes(fileName)) {
                                isReferenced = true;
                              }
                              
                              // Se for um URL da PeakD, verifica por padrões específicos
                              if (preview.includes('peakd-hive')) {
                                // Extrair o autor e o identificador das URLs do peakd-hive 
                                const peakdMatch = preview.match(/\/file\/peakd-hive\/([^\/]+)\/([^\/\?]+)/);
                                if (peakdMatch && peakdMatch.length > 2) {
                                  const author = peakdMatch[1];
                                  const id = peakdMatch[2];
                                  
                                  // Se qualquer uma dessas partes importantes estiver no conteúdo, consideramos referenciada
                                  if (newContent.includes(author) && newContent.includes(id)) {
                                    isReferenced = true;
                                  }
                                }
                              }
                              
                              if (!isReferenced) {
                                // Imagem não está mais referenciada no conteúdo
                                newPreviews.splice(i, 1);
                                newFiles.splice(i, 1);
                                newProgress.splice(i, 1);
                                changed = true;
                                console.log('Removida imagem PeakD:', fileName);
                              }
                            }
                            // Se for um link do PeakD, verificar se ainda está no conteúdo
                            else if (preview.includes('files.peakd.com')) {
                              // Extrair o identificador único da URL do PeakD
                              const peakdUrlMatch = preview.match(/\/file\/([^\/]+)\/([^\/\?]+)/);
                              if (peakdUrlMatch) {
                                const peakdId = peakdUrlMatch[2];
                                // Verificar se este ID ainda está presente no conteúdo
                                const stillExists = newContent.includes(peakdId);
                                if (!stillExists) {
                                  // ID não encontrado no conteúdo, remover
                                  newPreviews.splice(i, 1);
                                  newFiles.splice(i, 1);
                                  newProgress.splice(i, 1);
                                  changed = true;
                                }
                              } else {
                                // Se não conseguir extrair o ID, verificar a URL completa
                                const stillExists = newContent.includes(preview);
                                if (!stillExists) {
                                  newPreviews.splice(i, 1);
                                  newFiles.splice(i, 1);
                                  newProgress.splice(i, 1);
                                  changed = true;
                                }
                              }
                            }
                          }
                          
                          // Atualizar os estados se houver mudanças
                          if (changed) {
                            setFiles(newFiles);
                            setPreviews(newPreviews);
                            setUploadProgress(newProgress);
                            console.log('Imagens removidas do preview pois foram excluídas do conteúdo');
                          }
                        }
                        
                        // Verificar se houve uma restauração com Ctrl+Z ou cola
                        const ipfsUrlMatches: string[] = allMatches.map(match => match[0]);
                        
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
                      <span
                        key={tag + idx}
                        className="flex items-center bg-gray-700 text-white rounded-full px-3 py-1 text-xs"
                      >
                        #{tag}
                        <button
                          type="button"
                          className="ml-2 text-gray-300 hover:text-red-400 focus:outline-none"
                          onClick={() =>
                            setTags(tags.filter((t, i) => i !== idx))
                          }
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
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === "," || e.key === " ") &&
                        tagInput.trim()
                      ) {
                        e.preventDefault();
                        const newTag = tagInput
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9\-]/g, "");
                        if (
                          newTag &&
                          !tags.includes(newTag) &&
                          tags.length < 10 &&
                          newTag.length <= 24
                        ) {
                          setTags([...tags, newTag]);
                        }
                        setTagInput("");
                      } else if (
                        e.key === "Backspace" &&
                        !tagInput &&
                        tags.length > 0
                      ) {
                        setTags(tags.slice(0, -1));
                      }
                    }}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                    placeholder="Digite e pressione Enter para adicionar"
                    maxLength={24}
                    disabled={tags.length >= 10}
                  />
                 
                </div>

                {/* Preview das imagens */}
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
                          {uploadProgress[index] > 0 &&
                            uploadProgress[index] < 100 && (
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
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-white"
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensagem de erro */}
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
                      setError("");
                      resetForm();
                      setShowForm(false);
                    }}
                    className="px-4 py-2 rounded text-gray-300 hover:bg-gray-700 mr-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded text-white ${loading ? "bg-green-800" : "bg-green-600 hover:bg-green-700"}`}
                    disabled={loading}
                  >
                    {loading ? "Atualizando..." : "Atualizar Post"}
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
