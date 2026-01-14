import { useEffect, useState } from 'react';
import { getPostsByBlog } from '../../lib/hive/hive-client';

const TITLE_KEYWORDS = [
  'contato',
  'contact',
  'fale conosco',
  'get in touch',
  'email',
  'telefone',
];

function extractMediaFromPost(post: any) {
  const images: string[] = [];
  const videos: string[] = [];
  if (post.json_metadata) {
    let meta;
    try {
      meta = typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : post.json_metadata;
      if (meta && Array.isArray(meta.image)) {
        images.push(...meta.image);
      }
      if (meta && Array.isArray(meta.video)) {
        videos.push(...meta.video);
      }
    } catch {}
  }
  if (post.body) {
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(post.body))) {
      images.push(match[1]);
    }
    const videoRegex = /<video[^>]*src=["']([^"'>\s]+)["'][^>]*>/g;
    while ((match = videoRegex.exec(post.body))) {
      videos.push(match[1]);
    }
  }
  return { images, videos };
}

export function useDynamicContactPost(username: string) {
  const [permlink, setPermlink] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const posts = await getPostsByBlog(username);
        const found = posts.find((post: any) =>
          post.title && TITLE_KEYWORDS.some(keyword =>
            post.title.toLowerCase().includes(keyword),
          ),
        );
        if (found) {
          setPermlink(found.permlink);
          setTitle(found.title);
          setMarkdown(found.body);
          const media = extractMediaFromPost(found);
          setImages(Array.from(new Set(media.images)));
          setVideos(Array.from(new Set(media.videos)));
          
          // Extrair tags do json_metadata
          let postTags: string[] = [];
          try {
            const metadata = typeof found.json_metadata === 'string' 
              ? JSON.parse(found.json_metadata) 
              : found.json_metadata;
            if (metadata && Array.isArray(metadata.tags)) {
              postTags = metadata.tags;
            }
            console.log('[Contact] Tags extraídas:', postTags);
          } catch (e) {
            console.warn('Erro ao extrair tags:', e);
          }
          setTags(postTags);
        } else {
          setError('Nenhum post de contato encontrado para este usuário.');
        }
      } catch {
        setError('Erro ao buscar posts do usuário.');
      }
      setLoading(false);
    })();
  }, [username]);

  return { permlink, markdown, title, images, videos, tags, loading, error };
}
