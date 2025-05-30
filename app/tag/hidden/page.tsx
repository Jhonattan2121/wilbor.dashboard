import { HAS_DATABASE } from '@/app/config';
import { absolutePathForTag } from '@/app/paths';
import AnimateItems from '@/components/AnimateItems';
import Note from '@/components/Note';
import SiteGrid from '@/components/SiteGrid';
import PhotoGrid from '@/photo/PhotoGrid';
import { getPhotosNoStore } from '@/photo/cache';
import { getPhotosMeta } from '@/photo/db/query';
import { TAG_HIDDEN, descriptionForTaggedPhotos, titleForTag } from '@/tag';
import HiddenHeader from '@/tag/HiddenHeader';
import { Metadata } from 'next';
import { cache } from 'react';

const getPhotosHiddenMetaCached = cache(() =>
  getPhotosMeta({ hidden: 'only' }));

export async function generateMetadata(): Promise<Metadata> {
  if (!HAS_DATABASE) {
    return {
      title: 'Banco de dados não configurado',
      description: 'Banco de dados não configurado.',
    };
  }

  const { count, dateRange } = await getPhotosHiddenMetaCached();

  if (count === 0) { return {}; }

  const title = titleForTag(TAG_HIDDEN, undefined, count);
  const description = descriptionForTaggedPhotos(
    undefined,
    undefined,
    count,
    dateRange,
  );
  const url = absolutePathForTag(TAG_HIDDEN);

  return {
    title,
    openGraph: {
      title,
      description,
      url,
    },
    twitter: {
      description,
      card: 'summary_large_image',
    },
    description,
  };
}

export default async function HiddenTagPage() {
  if (!HAS_DATABASE) {
    return (
      <SiteGrid
        contentMain={<div className="space-y-4 mt-4">
          <Note animate>
            Banco de dados não configurado.
          </Note>
        </div>}
      />
    );
  }

  const [
    photos,
    { count, dateRange },
  ] = await Promise.all([
    getPhotosNoStore({ hidden: 'only' }),
    getPhotosHiddenMetaCached(),
  ]);

  return (
    <SiteGrid
      contentMain={<div className="space-y-4 mt-4">
        <AnimateItems
          type="bottom"
          items={[<HiddenHeader
            key="HiddenHeader"
            {...{ photos, count, dateRange }}
          />]}
          animateOnFirstLoadOnly
        />
        <div className="space-y-6">
          <Note animate>
            Only visible to authenticated admins
          </Note>
          <PhotoGrid {...{ photos }} />
        </div>
      </div>}
    />
  );
}
