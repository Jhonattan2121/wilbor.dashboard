'use client';

import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useEffect, useState } from 'react';
import { useDynamicFooterPost } from '../../src/app/footer/useDynamicFooterPost';
import ViewSwitcher from '../../src/app/ViewSwitcher';
import DashboardHeader from '../dashboard/DashboardHeader';
import PinataEditPostButton from '../dashboard/PinataEditPostButton';
import PinataMediaPostButton from '../dashboard/PinataMediaPostButton';

const HIVE_USERNAME = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

export const dynamic = 'force-static';
export const maxDuration = 60;

export default function FooterPage() {
  const [postingKey, setPostingKey] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const { permlink, markdown, title, images, tags, loading, error } = useDynamicFooterPost(
    username || HIVE_USERNAME,
  );

  useEffect(() => {
    const key = typeof window !== 'undefined' ? localStorage.getItem('dashboard_postingKey') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('dashboard_loginUser') : null;
    setPostingKey(key);
    setUsername(user);
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col">
      <ViewSwitcher currentSelection="footer" />

      <section className="w-full flex-1 flex flex-col items-start">
        <div className="w-full max-w-2xl text-left mx-0 px-3 sm:px-8 space-y-4 sm:space-y-6">
          {loading && <p>Carregando conteúdo...</p>}
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <DashboardHeader username={username} />
            </div>
            {markdown && permlink ? (
              <PinataEditPostButton
                username={username || HIVE_USERNAME}
                author={username || HIVE_USERNAME}
                permlink={permlink}
                initialTitle={title || ''}
                initialContent={markdown}
                initialTags={tags || []}
                initialImages={images || []}
                postingKey={postingKey || undefined}
              />
            ) : (
              <PinataMediaPostButton
                username={username || HIVE_USERNAME}
                postingKey={postingKey || undefined}
                initialCommunity="footer"
                onPostSuccess={() => window.location.reload()}
              />
            )}
          </div>

          {markdown && (
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer>
                {markdown}
              </MarkdownRenderer>
            </div>
          )}
        </div>
      </section>

     
    </div>
  );
}
