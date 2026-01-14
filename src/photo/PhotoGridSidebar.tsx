'use client';

import { SITE_ABOUT } from '@/app/config';
import HeaderList from '@/components/HeaderList';

// Type stubs for removed modules
export interface Camera {
  make: string;
  model: string;
}

export type Cameras = Array<{ camera: Camera; count: number }>;
export type FilmSimulation = string;
export type FilmSimulations = Array<{ simulation: FilmSimulation; count: number }>;

const _sortCamerasWithCount = (cameras: Cameras) => cameras;
const _sortFilmSimulationsWithCount = (simulations: FilmSimulations) => simulations;
import { useAppState } from '@/state/AppState';
import { TAG_FAVS, TAG_HIDDEN, Tags, addHiddenToTags } from '@/tag';
import HiddenTag from '@/tag/HiddenTag';
import PhotoTag from '@/tag/PhotoTag';
import {
  htmlHasBrParagraphBreaks,
  safelyParseFormattedHtml,
} from '@/utility/html';
import { clsx } from 'clsx/lite';
import { useMemo } from 'react';
import { FaTag } from 'react-icons/fa';
import { IoMdCamera } from 'react-icons/io';
import { PhotoDateRange, dateRangeForPhotos } from '.';
import FavsTag from '../tag/FavsTag';

export default function PhotoGridSidebar({
  tags,
  cameras,
  simulations,

  photosDateRange,
}: {
  tags: Tags
  cameras: Cameras
  simulations: FilmSimulations

  photosDateRange?: PhotoDateRange
}) {
  const { start, end } = dateRangeForPhotos(undefined, photosDateRange);

  const { hiddenPhotosCount } = useAppState();

  const tagsIncludingHidden = useMemo(() =>
    addHiddenToTags(tags, hiddenPhotosCount)
  , [tags, hiddenPhotosCount]);

  return (
    <div className="space-y-2">
      {SITE_ABOUT && <HeaderList
        items={[<p
          key="about"
          className={clsx(
            'max-w-60 normal-case text-main',
            htmlHasBrParagraphBreaks(SITE_ABOUT) && 'pb-2',
          )}
          dangerouslySetInnerHTML={{
            __html: safelyParseFormattedHtml(SITE_ABOUT),
          }}
        />]}
      />}
      {tags.length > 0 && <HeaderList
        title='Tags'
        icon={<FaTag
          size={12}
          className="text-icon translate-y-[1px]"
        />}
        items={tagsIncludingHidden.map(({ tag, count }) => {
          switch (tag) {
          case TAG_FAVS:
            return <FavsTag
              key={TAG_FAVS}
              countOnHover={count}
              type="icon-last"
              prefetch={false}
              contrast="low"
              badged
            />;
          case TAG_HIDDEN:
            return <HiddenTag
              key={TAG_HIDDEN}
              countOnHover={count}
              type="icon-last"
              prefetch={false}
              contrast="low"
              badged
            />;
          default:
            return <PhotoTag
              key={tag}
              tag={tag}
              type="text-only"
              countOnHover={count}
              prefetch={false}
              contrast="low"
              badged
            />;
          }
        })}
      />}
      {/* Camera and simulation sections removed - routes no longer exist */}
    </div>
  );
}
