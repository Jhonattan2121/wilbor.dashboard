'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Operation } from '@hiveio/dhive';
import { uploadFileToIPFS } from '@/utils/ipfs';
import { sendHiveOperation } from '../../lib/hive/server-functions';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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
  const showPreview = true;
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
  function applyMarkdown(type: string) {
    const textarea = contentRef.current;
    const current = content;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = current.slice(start, end);

    const wrap = (before: string, after: string = before) => {
      const next = current.slice(0, start) + before + selected + after + current.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        const cursor = start + before.length + selected.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    };

    const insertLine = (prefix: string) => {
      const next = current.slice(0, start) + prefix + selected + current.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        const cursor = start + prefix.length + selected.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    };

    switch (type) {
      case 'h1':
        insertLine('# ');
        break;
      case 'bold':
        wrap('**');
        break;
      case 'italic':
        wrap('*');
        break;
      case 'strike':
        wrap('~~');
        break;
      case 'code':
        wrap('`');
        break;
      case 'quote':
        insertLine('> ');
        break;
      case 'ul':
        insertLine('- ');
        break;
      case 'ol':
        insertLine('1. ');
        break;
      case 'link':
        wrap('[', '](url)');
        break;
      case 'codeblock':
        wrap('\n```\n', '\n```\n');
        break;
      case 'hr':
        insertLine('\n---\n');
        break;
      default:
        break;
    }
  }

  function handleContentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const next = content.slice(0, start) + '\n<br>\n' + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      const cursor = start + 6;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-screen h-screen max-w-none flex flex-col bg-zinc-900/95 border border-zinc-700/70 shadow-2xl">
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
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden shadow-inner h-[68vh] min-h-[420px] flex flex-col">
                        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800/80 px-2 py-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                            onClick={() => imageDropzone.open()}
                            aria-label="Inserir imagem"
                            title="Imagem"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                              <path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 9.5A1.5 1.5 0 1 1 10 8a1.5 1.5 0 0 1-1.5 1.5ZM5 19l4.5-6 3.5 4.5 2.5-3L19 19Z"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                            onClick={() => videoDropzone.open()}
                            aria-label="Inserir video"
                            title="Video"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                              <path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5l4 4v-11Z"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                            onClick={() => gifDropzone.open()}
                            aria-label="Inserir GIF"
                            title="GIF"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                              <path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3.5 6.5v3h2.5v-1h-1.5v-.5h1.5v-1h-2.5Zm4 0v3h1v-1h1.5a1 1 0 0 0 0-2H11.5Zm1 1h1.5v-.5H12.5v.5ZM16.5 11.5v3h1v-3h-1Z"/>
                            </svg>
                          </button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white" onClick={() => applyMarkdown('h1')} title="Heading">H</button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white font-bold" onClick={() => applyMarkdown('bold')} title="Bold">B</button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white italic" onClick={() => applyMarkdown('italic')} title="Italic">I</button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white line-through" onClick={() => applyMarkdown('strike')} title="Strike">S</button>
                          <button
                            type="button"
                            className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white"
                            onClick={() => applyMarkdown('code')}
                            title="Code"
                          >
                            {`</>`}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white"
                            onClick={() => applyMarkdown('codeblock')}
                            title="Code block"
                          >
                            {'{}'} 
                          </button>
                          <span className="h-4 w-px bg-zinc-700 mx-1" aria-hidden="true" />
                          <button
                            type="button"
                            className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white"
                            onClick={() => applyMarkdown('quote')}
                            title="Quote"
                          >
                            &quot;
                          </button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white" onClick={() => applyMarkdown('ul')} title="List">*</button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white" onClick={() => applyMarkdown('ol')} title="Numbered list">1.</button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white" onClick={() => applyMarkdown('link')} title="Link">[ ]( )</button>
                          <button type="button" className="text-xs text-zinc-200 px-1.5 py-0.5 hover:text-white" onClick={() => applyMarkdown('hr')} title="Divider">--</button>
                          <span className="ml-auto h-4 w-px bg-zinc-700" aria-hidden="true" />
                        </div>
                        <textarea
                          ref={contentRef}
                          value={content}
                          onChange={event => setContent(event.target.value)}
                          onKeyDown={handleContentKeyDown}
                          placeholder="Conteudo"
                          rows={8}
                          className="w-full flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none"
                        />
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

                  {showPreview && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden h-[68vh] min-h-[420px] flex flex-col">
                        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                          <span className="text-[11px] uppercase tracking-wide text-zinc-500">Preview</span>
                        </div>
                        <div className="flex-1 overflow-auto px-3 py-3 text-sm text-zinc-200">
                          <div className="prose prose-invert max-w-none break-words">
                            <MarkdownRenderer>
                              {transformExternalMedia(content) || 'Nada para mostrar.'}
                            </MarkdownRenderer>
                          </div>
                        </div>
                      </div>

                      {thumbnailCandidates.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Thumbnail pequena</p>
                          <div className="flex flex-wrap gap-0.5">
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
                                    `relative h-14 w-14 rounded border ` +
                                    `${isSelected ? 'border-green-400' : 'border-zinc-700'}`
                                  }
                                >
                                  <img src={candidate.preview} alt="" className="h-full w-full object-cover rounded" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
