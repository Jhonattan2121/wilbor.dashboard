'use client';

import { groupMediaByPermlink } from '@/components/MediaUtils';
import '@/styles/slider-custom.css';
import { clsx } from 'clsx/lite';
import { useState } from 'react';
import { HiveCommunitiesSelector } from './components/HiveCommunitiesSelector';
import { MediaItem } from './components/MediaItem';
import { PhotoGridContainerProps } from './components/types';

export default function PhotoGridContainer({
  sidebar,
  media = [],
  header,
  selectedTag,
  username,
  postingKey,
  isEditMode,
}: PhotoGridContainerProps & {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}) {
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);

  const groupedMedia = groupMediaByPermlink(media);

  const mediaGroups = Array.from(groupedMedia.entries())
    .filter(([_, group]) => {
      if (!selectedTag) return true;
      return group[0].tags?.includes(selectedTag);
    })
    .map(([permlink, group]) => ({ permlink, group }));

  return (
    <div className="w-full">
      <div className={clsx(
        'max-w-[2000px] mx-auto px-4 sm:px-6 md:px-8',
        header ? 'mb-5' : 'mb-2',
      )}>
        {username && (
          <HiveCommunitiesSelector
            username={username}
            selectedCommunity={selectedCommunity}
            setSelectedCommunity={setSelectedCommunity}
            postingKey={postingKey || undefined}
          />
        )}
        {header}

        <div className="grid gap-y-10 sm:gap-y-6 gap-x-2 sm:gap-x-4 md:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {mediaGroups.map(({ permlink, group }) => (
            <div
              key={permlink}
              className="relative col-span-1"
              aria-label={group[0]?.title || ''}
              title={group[0]?.title || ''}
            >
              <MediaItem
                items={group}
                username={username}
                postingKey={postingKey}
                isEditMode={isEditMode}
              />
            </div>
          ))}
        </div>
      </div>

      {sidebar && (
        <div className="hidden md:block">{sidebar}</div>
      )}
    </div>
  );
}
