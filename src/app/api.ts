import { Photo } from '@/photo';

export const API_PHOTO_REQUEST_LIMIT = 24;

export const formatPhotoForApi = (photo: Photo) => ({
  id: photo.id,
  title: photo.title,
  url: photo.url,
  src: photo.src,
  aspectRatio: photo.aspectRatio,
  takenAt: photo.takenAt.toISOString(),
  tags: photo.tags,
  camera: photo.make && photo.model
    ? { make: photo.make, model: photo.model }
    : undefined,
});

