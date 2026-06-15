'use client';

import { groupMediaByPermlink } from '@/components/MediaUtils';
import '@/styles/slider-custom.css';
import { clsx } from 'clsx/lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HiveCommunitiesSelector } from './components/HiveCommunitiesSelector';
import { MediaItem } from './components/MediaItem';
import { PhotoGridContainerProps } from './components/types';

export default function PhotoGridContainer({
  sidebar,
  media = [],
  header,
  selectedTag,
  setSelectedTag,
  username,
  postingKey,
  isEditMode,
}: PhotoGridContainerProps & {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
}) {
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [expandedPermlinks, setExpandedPermlinks] = useState<string[]>([]);
  const [hasLargeContentMap, setHasLargeContentMap] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groupedMedia = groupMediaByPermlink(media);

  const mediaGroups = Array.from(groupedMedia.entries())
    .filter(([_, group]) => {
      if (!selectedTag) return true;
      return group[0].tags?.includes(selectedTag);
    })
    .map(([permlink, group]) => ({ permlink, group }));

  // Scroll to expanded card
  useEffect(() => {
    if (expandedPermlinks.length !== 1) return;
    const permlink = expandedPermlinks[0];
    const ref = cardRefs.current[permlink];
    if (!ref) return;
    setTimeout(() => {
      const headerHeight = window.innerWidth >= 768 ? 90 : 64;
      const y = ref.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 20);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 150);
  }, [expandedPermlinks]);

  // Update URL when expanding/collapsing
  const updateUrlForProject = useCallback((permlink: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (permlink) {
      url.searchParams.set('project', permlink);
    } else {
      url.searchParams.delete('project');
    }
    window.history.pushState({}, '', url.toString());
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    const newTag = selectedTag === tag ? null : tag;
    const url = new URL(window.location.href);
    if (newTag) {
      url.searchParams.set('tag', newTag);
    } else {
      url.searchParams.delete('tag');
    }
    url.searchParams.delete('project');
    window.history.pushState({}, '', url.toString());
    setSelectedTag(newTag);
    setExpandedPermlinks([]);
    // Sobe para o topo para o usuário ver a barra de filtro e os resultados
    if (newTag) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedTag, setSelectedTag]);

  const handleContentSizeChange = useCallback((permlink: string, isLarge: boolean) => {
    setHasLargeContentMap(prev => ({ ...prev, [permlink]: isLarge }));
  }, []);

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

        {/* Barra de filtro ativo por tag */}
        {selectedTag && (
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <span className="font-mono text-xs uppercase tracking-wide text-zinc-500">
              Filtrando por
            </span>
            <button
              onClick={() => handleTagClick(selectedTag)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full font-mono text-sm bg-white text-black border border-white hover:bg-zinc-200 active:bg-zinc-300 active:scale-[0.98] transition-all duration-150 touch-manipulation"
              aria-label={`Remover filtro ${selectedTag}`}
            >
              #{selectedTag}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="font-mono text-xs text-zinc-500">
              {mediaGroups.length === 1 ? '1 projeto' : `${mediaGroups.length} projetos`}
            </span>
          </div>
        )}

        <div className={clsx(
          'grid',
          'gap-y-10 sm:gap-y-6 gap-x-2 sm:gap-x-4 md:gap-5',
          'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
          'grid-flow-dense',
          expandedPermlinks.length > 0 ? 'auto-rows-auto' : 'auto-rows-fr',
        )}>
          {mediaGroups.map(({ permlink, group }) => {
            const isExpanded = expandedPermlinks.includes(permlink);
            return (
              <div
                key={permlink}
                ref={el => { cardRefs.current[permlink] = el; }}
                className={clsx(
                  'relative overflow-hidden w-full rounded-lg transition-all duration-300',
                  isExpanded
                    ? (
                      hasLargeContentMap[permlink]
                        ? 'col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2 row-span-6 sm:row-span-7 md:row-span-8'
                        : 'col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2 row-span-4 sm:row-span-5 md:row-span-6'
                    )
                    : 'col-span-1',
                )}
                aria-label={group[0]?.title || ''}
                title={group[0]?.title || ''}
              >
                <MediaItem
                  items={group}
                  isExpanded={isExpanded}
                  onExpand={() => {
                    const newExpanded = expandedPermlinks.includes(permlink) ? [] : [permlink];
                    setExpandedPermlinks(newExpanded);
                    updateUrlForProject(newExpanded.length > 0 ? permlink : null);
                  }}
                  onContentSizeChange={isLarge => handleContentSizeChange(permlink, isLarge)}
                  onTagClick={handleTagClick}
                  hasLargeContent={!!hasLargeContentMap[permlink]}
                  username={username}
                  postingKey={postingKey}
                  isEditMode={isEditMode}
                  selectedTag={selectedTag}
                />
              </div>
            );
          })}
        </div>
      </div>

      {sidebar && (
        <div className="hidden md:block">{sidebar}</div>
      )}
    </div>
  );
}
