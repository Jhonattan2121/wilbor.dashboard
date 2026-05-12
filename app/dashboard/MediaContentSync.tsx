'use client';

interface MediaContentSyncProps {
  files: File[];
  previews: string[];
  content: string;
  uploadProgress: number[];
  onContentChange: (newContent: string) => void;
  onFilesChange: (newFiles: File[]) => void;
  onPreviewsChange: (newPreviews: string[]) => void;
  onUploadProgressChange: (newProgress: number[]) => void;
}

export default function MediaContentSync({
  files,
  previews,
  content,
  uploadProgress,
  onContentChange,
  onFilesChange,
  onPreviewsChange,
  onUploadProgressChange,
}: MediaContentSyncProps) {
  
  // Cria um arquivo placeholder baseado na URL
  const createPlaceholderFile = (url: string, isVideo: boolean = false): File => {
    // Determina o tipo baseado no parâmetro ou extensão da URL
    let type = 'application/octet-stream';
    
    if (isVideo || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
      type = 'video/mp4';
    } else {
      type = 'image/jpeg';
    }
    
    return new File([], 'placeholder', { type });
  };
  
  // Remove mídia do conteúdo quando uma imagem é removida
  const removeMediaFromContent = (
    urlToRemove: string,
    currentContent: string,
  ): string => {
    if (!currentContent) return currentContent;
    
    let novoConteudo = currentContent;

    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      
      // Divide o conteúdo em linhas
      const linhas = currentContent.split('\n');
      
      // Remove a primeira mídia encontrada já que estamos removendo por índice
      let midiaRemovida = false;
      const linhasFiltradas = linhas.filter(linha => {
        // Se já removeu uma mídia, mantém as outras
        if (midiaRemovida) return true;
        
        // Se a linha tem uma imagem markdown com IPFS, remove
        const pinataImagePattern = 
          '![image](https://lime-useful-snake-714.mypinata.cloud/ipfs/';
        // Se a linha tem um vídeo com IPFS, remove
        const pinataVideoPattern = 
          'https://lime-useful-snake-714.mypinata.cloud/ipfs/';
          
        if (linha.includes(pinataImagePattern) || 
            (linha.includes('<video') && linha.includes(pinataVideoPattern))) {
          midiaRemovida = true;
          return false;
        }
        
        return true;
      });
      
      novoConteudo = linhasFiltradas.join('\n').trim();
    } else {
      // Se não for blob, usa a URL diretamente
      const linhas = currentContent.split('\n');
      const linhasFiltradas = linhas.filter(linha => 
        !linha.includes(urlToRemove),
      );
      novoConteudo = linhasFiltradas.join('\n').trim();
    }
    
    return novoConteudo;
  };

  // Detecta quando conteúdo foi limpo e sincroniza mídias
  const handleContentCleared = (newContent: string) => {
    if (newContent.trim() === '') {
      // Revoga URLs blob para liberar memória
      previews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
      
      // Limpa todos os arrays
      onFilesChange([]);
      onPreviewsChange([]);
      onUploadProgressChange([]);
    }
  };

  // Detecta restauração de conteúdo (Ctrl+Z ou cola)
  const handleContentRestoration = (newContent: string) => {
    // Se já temos previews e o conteúdo não está vazio, não faz nada
    // Isso evita limpar mídias quando o usuário apenas digita ou adiciona <br>
    if (previews.length > 0 && newContent.trim() !== '') {
      // Verifica se há mudança significativa (remoção de muitas imagens)
      // Extrai URLs de imagens do conteúdo com regex mais flexível
      const ipfsImagePattern = new RegExp(
        '!\\[.*?\\]\\(https:\\/\\/[^)]*ipfs\\/[^)]*\\)',
        'g',
      );
      const imageMatches = newContent.match(ipfsImagePattern) || [];
      
      // Extrai URLs de vídeos do conteúdo - versão mais flexível
      const ipfsVideoPattern = /<video[^>]*src=["']([^"']*ipfs[^"']*)["'][^>]*>/g;
      const videoMatches = [...newContent.matchAll(ipfsVideoPattern)];
      
      // Combina todas as URLs encontradas
      const imageUrls = imageMatches.map(match => {
        const urlMatch = match.match(/\(([^)]+)\)/);
        return urlMatch ? urlMatch[1] : '';
      }).filter(url => url !== '');
      
      const videoUrls = videoMatches.map(match => match[1])
        .filter(url => url !== '');
      
      const allUrls = [...imageUrls, ...videoUrls];
      
      // Só sincroniza se houver uma diferença significativa (mais de 1 item)
      // Isso evita limpar quando apenas adicionamos <br> ou pequenas mudanças
      if (allUrls.length > 0 && Math.abs(allUrls.length - previews.length) > 1) {
        // Define todos como 100% concluídos
        const placeholderProgress = allUrls.map(() => 100);
        
        // Cria arquivos baseados no tipo de mídia
        const placeholderFiles = allUrls.map((url, index) => {
          // Verifica se esta URL é de um vídeo
          const isVideo = index >= imageUrls.length;
          return createPlaceholderFile(url, isVideo);
        });
        
        onFilesChange(placeholderFiles);
        onPreviewsChange(allUrls);
        onUploadProgressChange(placeholderProgress);
      }
      // Não limpa se não encontrar URLs - mantém as previews existentes
      return;
    }
    
    // Só processa restauração se não há previews ou conteúdo está vazio
    const ipfsImagePattern = new RegExp(
      '!\\[.*?\\]\\(https:\\/\\/[^)]*ipfs\\/[^)]*\\)',
      'g',
    );
    const imageMatches = newContent.match(ipfsImagePattern) || [];
    
    const ipfsVideoPattern = /<video[^>]*src=["']([^"']*ipfs[^"']*)["'][^>]*>/g;
    const videoMatches = [...newContent.matchAll(ipfsVideoPattern)];
    
    const imageUrls = imageMatches.map(match => {
      const urlMatch = match.match(/\(([^)]+)\)/);
      return urlMatch ? urlMatch[1] : '';
    }).filter(url => url !== '');
    
    const videoUrls = videoMatches.map(match => match[1])
      .filter(url => url !== '');
    
    const allUrls = [...imageUrls, ...videoUrls];
    
    // Só sincroniza se houver URLs e não houver previews
    if (allUrls.length > 0 && previews.length === 0) {
      const placeholderProgress = allUrls.map(() => 100);
      const placeholderFiles = allUrls.map((url, index) => {
        const isVideo = index >= imageUrls.length;
        return createPlaceholderFile(url, isVideo);
      });
      
      onFilesChange(placeholderFiles);
      onPreviewsChange(allUrls);
      onUploadProgressChange(placeholderProgress);
    }
  };

  // Função principal chamada quando o conteúdo muda
  const handleContentChange = (newContent: string) => {
    onContentChange(newContent);
    
    // Verifica se o conteúdo foi limpo
    if (newContent.trim() === '') {
      handleContentCleared(newContent);
    } else {
      // Sempre verifica se houve mudanças no conteúdo que precisam sincronizar
      handleContentRestoration(newContent);
    }
  };

  // Remove uma mídia por índice
  const handleMediaRemoved = (index: number) => {
    // Cria cópias das listas atuais
    const newFiles = [...files];
    const newPreviews = [...previews];
    const newProgress = [...uploadProgress];
    
    // Verifica se o índice é válido
    if (index < 0 || index >= newFiles.length) {
      console.error('Índice inválido para remoção de mídia:', index);
      return;
    }

    // Pega a URL que será removida ANTES de remover da lista
    const urlToRemove = newPreviews[index];

    // Revoga a URL de objeto para liberar memória
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
    }
    
    // Remove a URL do conteúdo
    const newContent = removeMediaFromContent(urlToRemove, content);
    onContentChange(newContent);
    
    // Remove dos arrays
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    newProgress.splice(index, 1);
    
    // Atualiza os estados
    onFilesChange(newFiles);
    onPreviewsChange(newPreviews);
    onUploadProgressChange(newProgress);
    
  };

  // Retorna as funções que o componente pai pode usar
  return {
    handleContentChange,
    handleMediaRemoved,
    removeMediaFromContent,
  };
}

// Hook personalizado para usar o MediaContentSync
export function useMediaContentSync({
  files,
  previews,
  content,
  uploadProgress,
  onContentChange,
  onFilesChange,
  onPreviewsChange,
  onUploadProgressChange,
}: MediaContentSyncProps) {
  
  const sync = MediaContentSync({
    files,
    previews,
    content,
    uploadProgress,
    onContentChange,
    onFilesChange,
    onPreviewsChange,
    onUploadProgressChange,
  });

  return sync;
}
