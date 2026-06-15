'use client';

import type { Operation } from '@hiveio/dhive';
import { useEffect, useMemo, useState } from 'react';
import { sendHiveOperation } from '../../lib/hive/server-functions';

interface ContactLinksEditButtonProps {
  username: string;
  author: string;
  permlink: string;
  initialBody: string;
  initialTitle: string;
  initialTags: string[];
  postingKey?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

type NetworkKind = 'phone' | 'email' | 'handle' | 'url';

interface NetworkDef {
  id: string;
  label: string;
  icon: string; // simpleicons slug
  placeholder: string;
  kind: NetworkKind;
  domain?: string;
}

const NETWORKS: NetworkDef[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', kind: 'phone', placeholder: '+55 21 99999-9999' },
  { id: 'email', label: 'E-mail', icon: 'gmail', kind: 'email', placeholder: 'voce@email.com' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', kind: 'handle', domain: 'instagram.com', placeholder: '@seu_usuario' },
  { id: 'vimeo', label: 'Vimeo', icon: 'vimeo', kind: 'handle', domain: 'vimeo.com', placeholder: 'vimeo.com/seu_usuario' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', kind: 'handle', domain: 'youtube.com', placeholder: 'youtube.com/@canal' },
  { id: 'odysee', label: 'Odysee', icon: 'odysee', kind: 'handle', domain: 'odysee.com', placeholder: 'odysee.com/@wilbor' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook', kind: 'handle', domain: 'facebook.com', placeholder: 'facebook.com/pagina' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok', kind: 'handle', domain: 'tiktok.com', placeholder: '@seu_usuario' },
  { id: 'twitter', label: 'X / Twitter', icon: 'x', kind: 'handle', domain: 'x.com', placeholder: '@seu_usuario' },
  { id: 'telegram', label: 'Telegram', icon: 'telegram', kind: 'handle', domain: 't.me', placeholder: 't.me/usuario' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', kind: 'handle', domain: 'linkedin.com', placeholder: 'linkedin.com/in/voce' },
  { id: 'soundcloud', label: 'SoundCloud', icon: 'soundcloud', kind: 'handle', domain: 'soundcloud.com', placeholder: 'soundcloud.com/voce' },
  { id: 'spotify', label: 'Spotify', icon: 'spotify', kind: 'url', placeholder: 'open.spotify.com/...' },
  { id: 'behance', label: 'Behance', icon: 'behance', kind: 'handle', domain: 'behance.net', placeholder: 'behance.net/voce' },
  { id: 'website', label: 'Site / Outro link', icon: 'googlechrome', kind: 'url', placeholder: 'https://seusite.com' },
  { id: 'custom', label: 'Outro (ícone personalizado)', icon: '', kind: 'url', placeholder: 'https://...' },
];

const NETWORK_BY_ID = new Map(NETWORKS.map(net => [net.id, net]));
const NETWORK_BY_ICON = new Map(NETWORKS.filter(net => net.icon).map(net => [net.icon, net.id]));

const DEFAULT_STYLE = `<style>
.contato-lista {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
}

.contato-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.contato-link {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #8d99ae;
}

.contato-texto {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.contato-icone {
  width: 24px;
  height: 24px;
  display: inline-block;
  background-color: currentColor;
  -webkit-mask: var(--icon) center/contain no-repeat;
  mask: var(--icon) center/contain no-repeat;
  transition: background-color 0.2s, transform 0.2s;
}

.contato-link:hover .contato-icone {
  background-color: #EA4335;
  transform: translateY(-1px);
}
</style>`;

interface ContactEntry {
  uid: string;
  network: string;
  value: string;
  iconSlug: string; // only used when network === 'custom'
}

function newUid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildHref(entry: ContactEntry): string {
  const net = NETWORK_BY_ID.get(entry.network);
  const raw = entry.value.trim();
  if (!raw) return '';
  if (!net) return raw;

  if (net.kind === 'email') {
    return raw.startsWith('mailto:') ? raw : `mailto:${raw}`;
  }
  if (net.kind === 'phone') {
    if (/^https?:\/\//i.test(raw)) return raw;
    const digits = raw.replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }
  // url + handle
  if (/^https?:\/\//i.test(raw)) return raw;
  // already looks like a domain/path the user pasted (e.g. "vimeo.com/wilbor")
  if (net.kind === 'url' || raw.includes('/') || raw.includes('.')) {
    return `https://${raw.replace(/^\/+/, '')}`;
  }
  // bare handle -> build from the network domain
  const handle = raw.replace(/^@/, '');
  return `https://${net.domain}/${handle}`;
}

function iconSlugFor(entry: ContactEntry): string {
  const net = NETWORK_BY_ID.get(entry.network);
  if (net && net.id !== 'custom' && net.icon) return net.icon;
  return entry.iconSlug.trim().toLowerCase();
}

function parseContacts(body: string): ContactEntry[] {
  const entries: ContactEntry[] = [];
  const itemRegex = /<li[^>]*class="contato-item"[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(body))) {
    const chunk = match[1];
    const hrefMatch = chunk.match(/href="([^"]*)"/i);
    const iconMatch = chunk.match(/cdn\.simpleicons\.org\/([a-z0-9-]+)/i);
    const textMatch = chunk.match(/class="contato-texto"[^>]*>([\s\S]*?)<\/span>/i);
    if (!hrefMatch && !iconMatch) continue;

    const href = hrefMatch ? decodeHtml(hrefMatch[1].trim()) : '';
    const slug = iconMatch ? iconMatch[1].toLowerCase() : '';
    const text = textMatch ? decodeHtml(textMatch[1].trim()) : '';

    const networkId = NETWORK_BY_ICON.get(slug) || 'custom';
    // Prefer the human-readable label; fall back to the href.
    let value = text;
    if (!value) {
      value = href.startsWith('mailto:') ? href.slice('mailto:'.length) : href;
    }
    entries.push({
      uid: newUid(),
      network: networkId,
      value,
      iconSlug: networkId === 'custom' ? slug : '',
    });
  }
  return entries;
}

function splitBody(body: string): { prefix: string; suffix: string } {
  const ulStart = body.search(/<ul[^>]*class="contato-lista"/i);
  const ulEndIdx = body.lastIndexOf('</ul>');
  if (ulStart === -1 || ulEndIdx === -1) {
    return { prefix: `${DEFAULT_STYLE}\n\n`, suffix: '' };
  }
  return {
    prefix: body.slice(0, ulStart),
    suffix: body.slice(ulEndIdx + '</ul>'.length),
  };
}

function buildBody(entries: ContactEntry[], prefix: string, suffix: string): string {
  const items = entries
    .map(entry => {
      const href = buildHref(entry);
      const slug = iconSlugFor(entry);
      if (!href || !slug) return '';
      const isExternal = /^https?:\/\//i.test(href);
      const targetAttr = isExternal ? ' target="_blank" rel="noopener"' : '';
      const text = escapeHtml(entry.value.trim());
      return `  <li class="contato-item">
    <a class="contato-link" href="${escapeHtml(href)}"${targetAttr}>
      <span class="contato-icone" style="--icon: url('https://cdn.simpleicons.org/${slug}');" aria-hidden="true"></span>
      <span class="contato-texto">${text}</span>
    </a>
  </li>`;
    })
    .filter(Boolean)
    .join('\n\n');

  const list = `<ul class="contato-lista">\n\n${items}\n\n</ul>`;
  return `${prefix}${list}${suffix}`;
}

export default function ContactLinksEditButton({
  username,
  author,
  permlink,
  initialBody,
  initialTitle,
  initialTags,
  postingKey,
  triggerLabel = 'Editar contatos',
  triggerClassName = 'inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg font-mono text-sm border border-zinc-600 text-zinc-300 hover:border-white hover:text-white active:bg-zinc-800 active:scale-[0.98] bg-black/80 backdrop-blur-sm transition-all duration-150 touch-manipulation',
}: ContactLinksEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ContactEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { prefix, suffix } = useMemo(() => splitBody(initialBody), [initialBody]);

  useEffect(() => {
    if (!isOpen) return;
    setEntries(parseContacts(initialBody));
    setError(null);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, initialBody]);

  function updateEntry(uid: string, patch: Partial<ContactEntry>) {
    setEntries(prev => prev.map(entry => (entry.uid === uid ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(uid: string) {
    setEntries(prev => prev.filter(entry => entry.uid !== uid));
  }

  function addEntry() {
    setEntries(prev => [...prev, { uid: newUid(), network: 'whatsapp', value: '', iconSlug: '' }]);
  }

  function moveEntry(uid: string, direction: -1 | 1) {
    setEntries(prev => {
      const index = prev.findIndex(entry => entry.uid === uid);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);

    const cleaned = entries.filter(entry => entry.value.trim());
    if (cleaned.length === 0) {
      setError('Adicione pelo menos um contato.');
      return;
    }
    const invalid = cleaned.find(entry => !iconSlugFor(entry));
    if (invalid) {
      setError('Defina o ícone (slug do simpleicons.org) para os contatos personalizados.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = buildBody(cleaned, prefix, suffix);
      const tags = initialTags && initialTags.length > 0 ? initialTags : ['hidden'];
      const metadata = {
        app: 'wilbor.art/dashboard',
        tags,
        image: [],
        video: [],
      };

      const operations: Operation[] = [[
        'comment',
        {
          parent_author: '',
          parent_permlink: tags[0],
          author,
          permlink,
          title: initialTitle?.trim() || 'contato',
          body,
          json_metadata: JSON.stringify(metadata),
        },
      ]];

      if (typeof window !== 'undefined' && (window as any).hive_keychain && !postingKey) {
        await new Promise<void>((resolve, reject) => {
          (window as any).hive_keychain.requestBroadcast(
            username,
            operations,
            'posting',
            (response: { success: boolean; message?: string }) => {
              if (!response?.success) {
                reject(new Error(response?.message || 'Erro no Hive Keychain.'));
                return;
              }
              resolve();
            },
          );
        });
      } else if (postingKey) {
        await sendHiveOperation(postingKey, operations);
      } else {
        throw new Error('Chave de postagem ausente. Faça login novamente.');
      }

      setIsOpen(false);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar os contatos.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" className={triggerClassName} onClick={() => setIsOpen(true)}>
        {triggerLabel}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-0 sm:items-center sm:p-6">
          <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border border-zinc-700/70 bg-zinc-900/95 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
            <div
              className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4"
              style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
            >
              <div>
                <h2 className="font-mono text-lg font-semibold text-white">Editar contatos</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Escolha a rede e preencha o link ou usuário. Os ícones aparecem automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
                className="-mr-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-2xl leading-none text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-zinc-700 touch-manipulation"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <div className="space-y-3">
                {entries.length === 0 && (
                  <p className="text-sm text-zinc-500">Nenhum contato ainda. Adicione o primeiro abaixo.</p>
                )}

                {entries.map((entry, index) => {
                  const slug = iconSlugFor(entry);
                  const net = NETWORK_BY_ID.get(entry.network);
                  const inputMode =
                    net?.kind === 'phone' ? 'tel' : net?.kind === 'email' ? 'email' : 'url';
                  return (
                    <div
                      key={entry.uid}
                      className="flex flex-col gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:gap-2"
                    >
                      <div className="flex items-center gap-2.5 sm:contents">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                          {slug ? (
                            <img
                              src={`https://cdn.simpleicons.org/${slug}`}
                              alt=""
                              className="h-5 w-5"
                              onError={e => {
                                (e.target as HTMLImageElement).style.visibility = 'hidden';
                              }}
                            />
                          ) : (
                            <span className="text-xs text-zinc-500">?</span>
                          )}
                        </div>

                        <select
                          value={entry.network}
                          onChange={e => updateEntry(entry.uid, { network: e.target.value })}
                          className="min-h-[44px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2 text-base text-white focus:outline-none focus:ring-1 focus:ring-zinc-500 touch-manipulation sm:w-44 sm:flex-none"
                        >
                          {NETWORKS.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {entry.network === 'custom' && (
                        <input
                          value={entry.iconSlug}
                          onChange={e => updateEntry(entry.uid, { iconSlug: e.target.value })}
                          placeholder="ícone (ex: github)"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:w-40"
                        />
                      )}

                      <input
                        value={entry.value}
                        onChange={e => updateEntry(entry.uid, { value: e.target.value })}
                        placeholder={net?.placeholder || 'https://...'}
                        inputMode={inputMode}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="done"
                        className="min-h-[44px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      />

                      <div className="flex flex-shrink-0 items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => moveEntry(entry.uid, -1)}
                          disabled={index === 0}
                          aria-label="Mover para cima"
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-zinc-700 active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveEntry(entry.uid, 1)}
                          disabled={index === entries.length - 1}
                          aria-label="Mover para baixo"
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-zinc-700 active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.uid)}
                          aria-label="Remover contato"
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-zinc-400 hover:bg-red-900/40 hover:text-red-300 active:bg-red-900/60 active:scale-95 transition-all duration-150 touch-manipulation"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addEntry}
                className="mt-4 inline-flex w-full min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-4 text-base text-zinc-300 hover:border-white hover:text-white active:bg-zinc-800 active:scale-[0.99] transition-all duration-150 touch-manipulation sm:w-auto"
              >
                + Adicionar contato
              </button>

              {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
            </div>

            <div
              className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-zinc-800 px-5 py-4"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-lg px-5 text-base text-zinc-300 hover:text-white active:bg-zinc-800 transition-all duration-150 touch-manipulation sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-lg bg-green-600 px-6 text-base font-medium text-white hover:bg-green-500 active:bg-green-700 active:scale-[0.98] transition-all duration-150 touch-manipulation disabled:opacity-60 sm:flex-none"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
