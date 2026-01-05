type VimeoUploadResponse = {
  link?: string;
  uri?: string;
  player_embed_url?: string;
  [key: string]: unknown;
};

type VimeoUploadRouteResponse = {
  data?: VimeoUploadResponse;
  error?: string;
};

export const uploadVideoToVimeo = async (file: File): Promise<VimeoUploadResponse> => {
  const encodedName = encodeURIComponent(file.name || 'video-upload');
  const response = await fetch('/api/vimeo/upload', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-file-name': encodedName,
    },
    body: file,
  });

  const payload = await response.json().catch(() => ({})) as VimeoUploadRouteResponse;

  if (!response.ok) {
    const message =
      typeof payload.error === 'string'
        ? payload.error
        : 'Vimeo upload failed';
    throw new Error(message);
  }

  return payload.data ?? {};
};
