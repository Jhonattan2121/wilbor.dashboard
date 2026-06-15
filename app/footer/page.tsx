'use client';

import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useEffect, useState } from 'react';
import { useDynamicFooterPost } from '../../src/app/footer/useDynamicFooterPost';
import ViewSwitcher from '../../src/app/ViewSwitcher';
import PinataEditPostButton from '../dashboard/PinataEditPostButton';
import PinataMediaPostButton from '../dashboard/PinataMediaPostButton';

const HIVE_USERNAME = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

const EDIT_TRIGGER_CLASSES = `inline-flex items-center justify-center min-h-[52px] px-8
  rounded-lg font-mono text-base border border-zinc-500 text-white bg-black/80
  hover:border-white hover:bg-zinc-900 active:bg-zinc-800
  transition-all duration-150`;

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
      <ViewSwitcher />

      <section className="w-full flex-1 flex flex-col items-center px-4 sm:px-8">
        <div className="w-full max-w-xl flex flex-col items-center text-center pt-10 sm:pt-16 pb-12 space-y-7">
          <div>
            <h1 className="font-mono text-2xl sm:text-3xl font-semibold text-white">
              Rodapé do site
            </h1>
            <p className="mt-3 text-base sm:text-lg text-zinc-400 leading-relaxed">
              O que você escrever aqui aparece no fim de todas as páginas do
              wilbor.art — copyright, créditos e links.
            </p>
          </div>

          {loading && <p className="text-zinc-400">Carregando conteúdo...</p>}
          {error && !loading && <p className="text-red-400">{error}</p>}

          {!loading && (markdown && permlink ? (
            <PinataEditPostButton
              username={username || HIVE_USERNAME}
              author={username || HIVE_USERNAME}
              permlink={permlink}
              initialTitle={title || ''}
              initialContent={markdown}
              initialTags={tags || []}
              initialImages={images || []}
              postingKey={postingKey || undefined}
              triggerLabel="Editar rodapé"
              triggerClassName={EDIT_TRIGGER_CLASSES}
            />
          ) : (
            <PinataMediaPostButton
              username={username || HIVE_USERNAME}
              postingKey={postingKey || undefined}
              initialCommunity="footer"
              onPostSuccess={() => window.location.reload()}
              triggerLabel="+ Criar rodapé"
              triggerClassName={EDIT_TRIGGER_CLASSES}
            />
          ))}

          {markdown && (
            <div className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wide text-zinc-500 mb-3 select-none">
                Conteúdo atual
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer>
                  {markdown}
                </MarkdownRenderer>
              </div>
            </div>
          )}
        </div>
      </section>

     
    </div>
  );
}
