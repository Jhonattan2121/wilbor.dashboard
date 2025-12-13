'use client';

import PhotoShareModal from '@/photo/PhotoShareModal';
import TagShareModal from '@/tag/TagShareModal';
import { useAppState } from '@/state/AppState';

export default function ShareModals() {
  const { shareModalProps = {} } = useAppState();
  
  const {
    photo,
    photos,
    count,
    dateRange,
    tag,
  } = shareModalProps;

  if (photo) {
    return <PhotoShareModal {...{photo, tag}} />;
  } else if (photos && tag) {
    return <TagShareModal {...{tag, photos, count, dateRange}} />;
  }
}
