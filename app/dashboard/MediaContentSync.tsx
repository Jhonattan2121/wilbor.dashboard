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
  
  // Remove mídia do conteúdo quando uma imagem é removida
  const removeMediaFromContent = (
    urlToRemove: string,
    currentContent: string,
  ): string => {
    if (!currentContent) return currentContent;
    
    console.log('Removendo mídia do conteúdo');
    console.log('URL a remover:', urlToRemove);
    console.log('Conteúdo antes:', currentContent);
    
    let novoConteudo = currentContent;
    
    // Se a URL for blob, precisa encontrar a URL IPFS correspondente 
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      console.log('É uma URL blob, procurando por URLs IPFS no conteúdo...');
      
      // Divide o conteúdo em linhas
      const linhas = currentContent.split('\n');
      
      // Remove a primeira imagem encontrada já que estamos removendo por índice
      let imagemRemovida = false;
      const linhasFiltradas = linhas.filter(linha => {
        // Se já removeu uma imagem, mantém as outras
        if (imagemRemovida) return true;
        
        // Se a linha tem uma imagem markdown com IPFS, remove
        const pinataImagePattern = 
          '![image](https://lime-useful-snake-714.mypinata.cloud/ipfs/';
        if (linha.includes(pinataImagePattern)) {
          console.log('Removendo linha com imagem IPFS:', linha);
          imagemRemovida = true;
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
    
    console.log('Conteúdo depois:', novoConteudo);
    return novoConteudo;
  };

  // Detecta quando conteúdo foi limpo e sincroniza mídias
  const handleContentCleared = (newContent: string) => {
    if (newContent.trim() === '') {
      console.log('Conteúdo limpo, removendo todas as mídias');
      
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
    // Verifica se houve uma restauração com Ctrl+Z ou cola
    // Extrai todas as URLs de imagens do conteúdo
    const ipfsUrlPattern = new RegExp(
      '!\\[image\\]\\(https:\\/\\/lime-useful-snake-714\\.mypinata\\.' +
      'cloud\\/ipfs\\/[^)]*\\)',
      'g',
    );
    const ipfsUrlMatches = newContent.match(ipfsUrlPattern) || [];
    
    // Se há URLs no texto, mas poucas ou nenhuma imagem no preview, sincroniza
    if (ipfsUrlMatches.length > 0 && 
        ipfsUrlMatches.length !== previews.length) {
      console.log('Restaurando imagens do conteúdo', ipfsUrlMatches.length);
      
      // Extrai as URLs reais das imagens do texto
      const extractedUrls = ipfsUrlMatches.map(match => {
        const urlMatch = match.match(/\(([^)]+)\)/);
        return urlMatch ? urlMatch[1] : '';
      }).filter(url => url !== '');
      
      // Define todos como 100% concluídos
      const placeholderProgress = extractedUrls.map(() => 100);
      
      // Cria arquivos vazios como marcadores (não serão enviados)
      const placeholderFiles = extractedUrls.map(() => 
        new File([], 'placeholder'),
      );
      
      onFilesChange(placeholderFiles);
      onPreviewsChange(extractedUrls);
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
      // Verifica se houve restauração de conteúdo
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
    console.log('Removendo mídia com URL:', urlToRemove);

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
    
    console.log('Mídia removida com sucesso!');
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
