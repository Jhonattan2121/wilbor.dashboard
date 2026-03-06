'use client';

import Markdown from '@/components/Markdown';
import { uploadFileToIPFS } from '@/utils/ipfs';
import type { Operation } from '@hiveio/dhive';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { sendHiveOperation } from '../../lib/hive/server-functions';


interface PinataEditPostButtonProps {
  username: string;
  postingKey?: string;
  permlink: string;
  author: string;
  initialTitle: string;
  initialContent: string;
  initialTags: string[];
  initialImages: string[];
  initialThumbnail?: string;
}

const PINATA_GATEWAY = 'https://ipfs.skatehive.app/ipfs';

function buildPinataUrl(hash: string) {
  return `${PINATA_GATEWAY}/${hash}`;
}

function normalizeTags(tags: string[]) {
  const cleaned = tags
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function removeUrlFromMarkdown(markdown: string, url: string) {
  if (!markdown || !url) return markdown;
  const baseUrl = url.split('?')[0].split('#')[0];
  const escapedBase = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const imagePattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapedBase}[^)]*\\)`);
  const videoPattern = new RegExp(`<video[^>]*src=["']${escapedBase}[^"']*["'][^>]*>`, 'i');
  const lines = markdown.split('\n');
  const filtered = lines.filter(line => {
    if (imagePattern.test(line)) return false;
    if (videoPattern.test(line)) return false;
    return true;
  });
  return filtered.join('\n').trim();
}

function transformExternalMedia(markdown: string) {
  if (!markdown) return markdown;
  const urlLinePattern = /^https?:\/\/[^\s]+$/i;
  const youtubePattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/i;
  const vimeoPattern = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
  const videoFilePattern = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i;

  const lines = markdown.split('\n');
  const updated = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.includes('<iframe') || trimmed.includes('<video')) return line;
    if (trimmed.startsWith('![')) return line;
    if (!urlLinePattern.test(trimmed)) return line;

    const youtubeMatch = trimmed.match(youtubePattern);
    if (youtubeMatch) {
      const id = youtubeMatch[1];
      return `<iframe src="https://www.youtube.com/embed/${id}" allow="autoplay; fullscreen" frameborder="0"></iframe>`;
    }

    const vimeoMatch = trimmed.match(vimeoPattern);
    if (vimeoMatch) {
      const id = vimeoMatch[1];
      return `<iframe src="https://player.vimeo.com/video/${id}" allow="autoplay; fullscreen" frameborder="0"></iframe>`;
    }

    if (videoFilePattern.test(trimmed)) {
      return `<video src="${trimmed}" controls></video>`;
    }

    return line;
  });

  return updated.join('\n');
}

type ThumbnailChoice =
  | { source: 'existing'; index: number }
  | { source: 'new'; index: number }
  | null;

export default function PinataEditPostButton({
  username,
  postingKey,
  permlink,
  author,
  initialTitle,
  initialContent,
  initialTags,
  initialImages,
  initialThumbnail,
}: PinataEditPostButtonProps) {
  const initialImagesWithThumbnail = useMemo(() => {
    if (initialThumbnail && !initialImages.includes(initialThumbnail)) {
      return [initialThumbnail, ...initialImages];
    }
    return initialImages;
  }, [initialImages, initialThumbnail]);

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [thumbnailChoice, setThumbnailChoice] = useState<ThumbnailChoice>(
    initialImagesWithThumbnail.length > 0 ? { source: 'existing', index: 0 } : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const imageAccept = useMemo(() => ({
    'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'],
  }), []);
  const videoAccept = useMemo(() => ({
    'video/*': ['.mp4', '.mov'],
  }), []);
  const gifAccept = useMemo(() => ({
    'image/gif': ['.gif'],
  }), []);

  useEffect(() => {
    if (!isOpen) return;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      document.documentElement.style.setProperty('overflow', originalHtmlOverflow);
      document.body.style.setProperty('overflow', originalBodyOverflow);
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  const newImageCandidates = useMemo(() => {
    return mediaFiles
      .map((file, index) => ({
        file,
        index,
        preview: mediaPreviews[index],
        isImage: file.type.startsWith('image/'),
      }))
      .filter(item => item.isImage);
  }, [mediaFiles, mediaPreviews]);

  useEffect(() => {
    if (initialImagesWithThumbnail.length > 0 && thumbnailChoice === null) {
      setThumbnailChoice({ source: 'existing', index: 0 });
    }
  }, [initialImagesWithThumbnail, thumbnailChoice]);

  function addTagsFromInput(raw: string) {
    const pieces = raw.split(/[,\s]+/g).map(p => p.trim()).filter(Boolean);
    if (pieces.length === 0) return;
    setTags(prev => normalizeTags([...prev, ...pieces]));
    setTagInput('');
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTagsFromInput(tagInput);
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }
  async function processSelectedFiles(selected: File[]) {
    if (selected.length === 0) return;
    const previews = selected.map(file => URL.createObjectURL(file));
    setMediaFiles(prev => [...prev, ...selected]);
    setMediaPreviews(prev => [...prev, ...previews]);

    try {
      const uploads = await Promise.all(selected.map(async file => {
        const result = await uploadFileToIPFS(file);
        const url = buildPinataUrl(result.IpfsHash);
        return { url, isVideo: file.type.startsWith('video/') };
      }));
      const urls = uploads.map(item => item.url);
      setMediaUrls(prev => [...prev, ...urls]);
      const markdown = uploads
        .map(item => item.isVideo
          ? `<video src="${item.url}" controls></video>`
          : `![image](${item.url})`)
        .join('\n\n');
      setContent(prev => [prev.trim(), markdown].filter(Boolean).join('\n\n'));
    } catch (_error) {
      setError('Falha ao enviar mídia para o Pinata.');
    }
  }

  async function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    await processSelectedFiles(selected);
    event.target.value = '';
  }

  const imageDropzone = useDropzone({
    accept: imageAccept,
    multiple: true,
    noClick: true,
    onDrop: async (files) => {
      await processSelectedFiles(files);
    },
  });

  const videoDropzone = useDropzone({
    accept: videoAccept,
    multiple: true,
    noClick: true,
    onDrop: async (files) => {
      await processSelectedFiles(files);
    },
  });

  const gifDropzone = useDropzone({
    accept: gifAccept,
    multiple: true,
    noClick: true,
    onDrop: async (files) => {
      await processSelectedFiles(files);
    },
  });

  function removeMedia(index: number) {
    setMediaFiles(prev => prev.filter((_, i) => i != index));
    setMediaPreviews(prev => {
      const preview = prev[index];
      if (preview) URL.revokeObjectURL(preview);
      return prev.filter((_, i) => i != index);
    });
    setMediaUrls(prev => {
      const urlToRemove = prev[index];
      if (urlToRemove) {
        setContent(current => removeUrlFromMarkdown(current, urlToRemove));
      }
      return prev.filter((_, i) => i != index);
    });
  }

  async function uploadMedia() {
    if (mediaUrls.length === mediaFiles.length && mediaUrls.length > 0) {
      return mediaFiles.map((file, index) => ({
        url: mediaUrls[index],
        isVideo: file.type.startsWith('video/'),
      }));
    }
    const uploaded = [] as { url: string; isVideo: boolean }[];
    for (const file of mediaFiles) {
      const result = await uploadFileToIPFS(file);
      const url = buildPinataUrl(result.IpfsHash);
      uploaded.push({ url, isVideo: file.type.startsWith('video/') });
    }
    setMediaUrls(uploaded.map(item => item.url));
    return uploaded;
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Titulo obrigatorio.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const uploaded = await uploadMedia();
      const newImages = uploaded.filter(entry => !entry.isVideo).map(entry => entry.url);
      const combinedImages = [...initialImagesWithThumbnail, ...newImages];

      let selectedThumbnail: string | undefined;
      if (thumbnailChoice?.source === 'existing') {
        selectedThumbnail = initialImagesWithThumbnail[thumbnailChoice.index];
      } else if (thumbnailChoice?.source === 'new') {
        const newIndex = thumbnailChoice.index;
        const newImage = newImages.find((_, index) => index === newIndex);
        selectedThumbnail = newImage;
      } else {
        selectedThumbnail = combinedImages[0];
      }

      const mediaEntriesForBody = uploaded.filter(
        entry => entry.url !== selectedThumbnail,
      );
      const enrichedContent = transformExternalMedia(content.trim());
      const mediaEntriesMissing = mediaEntriesForBody.filter(
        entry => !enrichedContent.includes(entry.url),
      );
      const mediaMarkdown = mediaEntriesMissing
        .map(entry =>
          entry.isVideo
            ? `<video src="${entry.url}" controls></video>`
            : `![image](${entry.url})`,
        )
        .join('\n\n');

      const body = [enrichedContent, mediaMarkdown].filter(Boolean).join('\n\n');
      const shouldRemoveThumbnailFromBody = mediaEntriesForBody.length > 0;
      const sanitizedBody = selectedThumbnail
        ? removeUrlFromMarkdown(body, selectedThumbnail)
        : body;
      const finalBody = sanitizedBody;
      const orderedImages = selectedThumbnail
        ? [selectedThumbnail, ...combinedImages.filter(url => url != selectedThumbnail)]
        : combinedImages;

     const normalizedTags = normalizeTags(tags);
      if (normalizedTags.length === 0) {
        setError('Adicione pelo menos 1 tag antes de atualizar.');
        return;
      }
      
      const parentPermlink = normalizedTags[0];

      const metadata = {
        app: 'wilbor.dashboard',
        tags: normalizedTags,
        image: orderedImages,
        thumbnail: selectedThumbnail || undefined,
      } as Record<string, unknown>;

      const operations: Operation[] = [[
        'comment',
        {
          parent_author: '',
          parent_permlink: parentPermlink,
          author,
          permlink,
          title: title.trim(),
          body: finalBody,
          json_metadata: JSON.stringify(metadata),
        },
      ]];

      if (typeof window !== 'undefined' && (window as any).hive_keychain && !postingKey) {
        await new Promise<void>((resolve, reject) => {
          (window as any).hive_keychain.requestBroadcast(
            username,
            operations,
            'posting',
            (response: { success: boolean; message?: string }) => {
              if (!response?.success) {
                reject(new Error(response?.message || 'Erro no Hive Keychain.'));
                return;
              }
              resolve();
            },
          );
        });
      } else if (postingKey) {
        await sendHiveOperation(postingKey, operations);
      } else {
        throw new Error('Posting key ausente.');
      }

      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const thumbnailCandidates = [
    ...initialImagesWithThumbnail.map((url, index) => ({
      key: `existing-${index}`,
      preview: url,
      choice: { source: 'existing', index } as ThumbnailChoice,
    })),
    ...newImageCandidates.map((item, index) => ({
      key: `new-${item.index}`,
      preview: item.preview,
      choice: { source: 'new', index } as ThumbnailChoice,
    })),
  ];

  return (
    <div>
      <button
        type="button"
        className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-500 transition"
        onClick={() => setIsOpen(true)}
      >
        Editar
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="relative w-screen max-w-none max-h-screen flex flex-col bg-zinc-900/95 border border-zinc-700/70 shadow-2xl">
            <div className="px-4 md:px-5 pt-4 md:pt-5 pb-0 flex-shrink-0">
              <div>
                <label className="sr-only">Titulo</label>
                <input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Titulo"
                  className="w-full h-11 rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 md:px-5 py-4">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr] items-start">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="sr-only">Conteudo</label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2 px-2 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition"
                          onClick={() => imageDropzone.open()}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 9.5A1.5 1.5 0 1 1 10 8a1.5 1.5 0 0 1-1.5 1.5ZM5 19l4.5-6 3.5 4.5 2.5-3L19 19Z"/>
                          </svg>
                          Imagem
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition"
                          onClick={() => videoDropzone.open()}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5l4 4v-11Z"/>
                          </svg>
                          Vídeo
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition"
                          onClick={() => gifDropzone.open()}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3.5 6.5v3h2.5v-1h-1.5v-.5h1.5v-1h-2.5Zm4 0v3h1v-1h1.5a1 1 0 0 0 0-2H11.5Zm1 1h1.5v-.5H12.5v.5ZM16.5 11.5v3h1v-3h-1Z"/>
                          </svg>
                          GIF
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 h-[68vh] min-h-[420px]">
                        {/* Editor */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden shadow-inner flex flex-col">
                          <div className="border-b border-zinc-800 px-3 py-2 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">Editor</span>
                          </div>
                          <textarea
                            ref={contentRef}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Escreva seu conteúdo em Markdown...

# Título
## Subtítulo
**Negrito** *Itálico*

- Lista
- Item 2"
                            className="flex-1 w-full resize-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none font-mono"
                          />
                        </div>

                        {/* Preview (EXATO como no site blog) */}
                        <div className="rounded-xl border border-zinc-800 overflow-hidden shadow-inner flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
                          <div className="border-b border-zinc-800 px-3 py-2 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">Preview (como aparece no site)</span>
                          </div>
                          <div className="flex-1 overflow-auto px-4 py-3 markdown-preview-blog">
                            <Markdown>
                              {content || '*Nada para mostrar ainda*'}
                            </Markdown>
                          </div>
                        </div>
                      </div>
                      <input {...imageDropzone.getInputProps({ className: 'hidden' })} />
                      <input {...videoDropzone.getInputProps({ className: 'hidden' })} />
                      <input {...gifDropzone.getInputProps({ className: 'hidden' })} />
                    </div>

                    <div>
                      <label className="sr-only">Tags</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                       {tags.map(tag => (
                          <span key={tag} className="text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-200 px-2 py-1 rounded-md">
                            {tag}
                            <button
                              type="button"
                              className="ml-1 text-zinc-400 hover:text-white"
                              onClick={() => removeTag(tag)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        value={tagInput}
                        onChange={event => setTagInput(event.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={() => addTagsFromInput(tagInput)}
                        placeholder="Digite tags e pressione Enter"
                        className="w-full h-11 rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      />
                    </div>
                  </div>

                  {thumbnailCandidates.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Thumbnail da capa</p>
                        <div className="flex flex-wrap gap-2">
                          {thumbnailCandidates.map(candidate => {
                            const isSelected =
                              thumbnailChoice?.source === candidate.choice?.source &&
                              thumbnailChoice?.index === candidate.choice?.index;
                            return (
                              <button
                                key={candidate.key}
                                type="button"
                                onClick={() => setThumbnailChoice(candidate.choice)}
                                className={
                                  `relative h-20 w-20 rounded-lg border-2 transition ` +
                                  `${isSelected ? 'border-green-400 ring-2 ring-green-400/30' : 'border-zinc-700 hover:border-zinc-600'}`
                                }
                              >
                                <img src={candidate.preview} alt="" className="h-full w-full object-cover rounded-md" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="text-xs text-red-400">{error}</div>
                )}
              </div>
            </div>

            <div className="px-4 md:px-5 py-4 border-t border-zinc-800 flex-shrink-0 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 text-sm text-zinc-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
