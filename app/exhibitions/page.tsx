"use client";

import { useEffect, useRef, useState } from 'react';
import { useDynamicExhibitionsPost } from '../../src/app/exhibitions/useDynamicExhibitionsPost';
import ViewSwitcher from '../../src/app/ViewSwitcher';
import JsonLd from '../components/JsonLd';
import DashboardHeader from '../dashboard/DashboardHeader';
import NewEditPostButton from '../dashboard/NewEditPostButton';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export const dynamic = 'force-static';
export const maxDuration = 60;



const HIVE_USERNAME = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

export default function ExhibitionsPage() {
  const [username, setUsername] = useState<string | null>(null);
  const { permlink, markdown, title, images, videos, loading, error } = useDynamicExhibitionsPost(username || HIVE_USERNAME);
  const [postingKey, setPostingKey] = useState<string | null>(null);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const swiperRef = useRef<any>(null);
  const goPrev = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    }
  };
  const goNext = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    }
  };
  const media = [...(images || []), ...(videos || [])];

  useEffect(() => {
    const key = typeof window !== 'undefined' ? localStorage.getItem('dashboard_postingKey') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('dashboard_loginUser') : null;
    setPostingKey(key);
    setUsername(user);
  }, []);

  return (
    <>
      <ViewSwitcher currentSelection="exhibitions" />
      <div className="w-full px-4 sm:px-8 pt-4 md:px-12 py-12  dark:text-gray-200 text-left">
        <div className="max-w-4xl w-full text-left space-y-4 sm:space-y-6 mx-0">

          {loading && <p>Carregando conteúdo...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {markdown && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <DashboardHeader username={username} />

                </div>
                <NewEditPostButton
                  username={username || HIVE_USERNAME}
                  author={username || HIVE_USERNAME}
                  permlink={permlink || ''}
                  initialTitle={title || ''}
                  initialContent={markdown}
                  initialTags={[]}
                  initialImages={images || []}
                  postingKey={postingKey || undefined}
                />
              </div>

              <div className="prose dark:prose-invert max-w-none">
                 <MarkdownRenderer>
                  {` ${title}\n${markdown.replace(/!\[[^\]]*\]\([^\)]+\)/g, '')}`}
                </MarkdownRenderer>
              </div>
              {media.length > 0 && (
                <div className="my-6 w-full">
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}