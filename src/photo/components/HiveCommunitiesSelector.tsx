import { Client, Operation, PrivateKey } from '@hiveio/dhive';
import { clsx } from 'clsx/lite';
import dynamic from 'next/dynamic';
import { useRouter as _useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendHiveOperation } from '../../../lib/hive/server-functions';
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer';
import MarkdownRendererComponent from '@/components/MarkdownRenderer';

const PinataMediaPostButton = dynamic(
  () => import('../../../app/dashboard/PinataMediaPostButton'),
  { ssr: false },
);

interface HiveCommunity {
  name: string;
  title: string;
  about?: string;
  subscribers?: number;
  avatar_url?: string;
  role?: string;
  postsCount?: number; 
}

interface HiveCommunitiesSelectorProps {
  username: string | null;
  selectedCommunity: string | null;
  setSelectedCommunity: (community: string | null) => void;
  postingKey?: string;
}

export function HiveCommunitiesSelector({
  username,
  selectedCommunity,
  setSelectedCommunity,
  postingKey,
}: HiveCommunitiesSelectorProps) {
  useTextShadowStyle();
  const [userCommunities, setUserCommunities] = useState<HiveCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedCommunityForPost, setSelectedCommunityForPost] = useState<string | null>(null);
  const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [allCommunities, setAllCommunities] = useState<HiveCommunity[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [selectedCommunityData, setSelectedCommunityData] = useState<HiveCommunity | null>(null);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [showUserCommunityPostsModal, setShowUserCommunityPostsModal] = useState(false);
  const [selectedUserCommunity, setSelectedUserCommunity] = useState<HiveCommunity | null>(null);
  const [userCommunityPosts, setUserCommunityPosts] = useState<any[]>([]);
  const [loadingUserCommunityPosts, setLoadingUserCommunityPosts] = useState(false);
  const [expandedUserPosts, setExpandedUserPosts] = useState<Set<string>>(new Set());

  // Função para buscar posts da comunidade
  async function fetchCommunityPosts(communityName: string) {
    setLoadingPosts(true);
    try {
      const response = await fetch('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.get_ranked_posts',
          params: { sort: 'created', tag: communityName, limit: 20 },
          id: 1,
        }),
      });
      const data = await response.json();
      if (data.result && Array.isArray(data.result)) {
        setCommunityPosts(data.result);
      } else {
        setCommunityPosts([]);
      }
    } catch (error) {
      console.error('Error fetching community posts:', error);
      setCommunityPosts([]);
    }
    setLoadingPosts(false);
  }

  // Função para abrir modal da comunidade
  function handleOpenCommunityModal(community: HiveCommunity) {
    setSelectedCommunityData(community);
    setShowCommunityModal(true);
    fetchCommunityPosts(community.name);
  }

  // Função para buscar posts da comunidade do usuário
  async function fetchUserCommunityPosts(communityName: string) {
    setLoadingUserCommunityPosts(true);
    try {
      const response = await fetch('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.get_ranked_posts',
          params: { sort: 'created', tag: communityName, limit: 20 },
          id: 1,
        }),
      });
      const data = await response.json();
      if (data.result && Array.isArray(data.result)) {
        setUserCommunityPosts(data.result);
      } else {
        setUserCommunityPosts([]);
      }
    } catch (error) {
      console.error('Error fetching user community posts:', error);
      setUserCommunityPosts([]);
    }
    setLoadingUserCommunityPosts(false);
  }

  // Função para abrir modal de posts da comunidade do usuário
  function handleOpenUserCommunityPosts(community: HiveCommunity) {
    setSelectedUserCommunity(community);
    setShowUserCommunityPostsModal(true);
    fetchUserCommunityPosts(community.name);
  }

  // Função para buscar comunidades do usuário
  async function fetchUserCommunities() {
    if (!username) return;
    setLoading(true);
    try {
      const res = await fetch('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.list_all_subscriptions',
          params: { account: username },
          id: 1,
        }),
      });
      const data = await res.json();
      let communities: HiveCommunity[] = [];
      if (data.result && Array.isArray(data.result)) {
        // Se for array de arrays [name, title, role, about]
        if (data.result.length > 0 && Array.isArray(data.result[0])) {
          communities = data.result.map((arr: any[]) => ({
            name: arr[0],
            title: arr[1] || arr[0],
            role: arr[2] || 'guest',
            about: arr[3] || '',
            subscribers: Math.floor(Math.random() * 10000) + 100,
            postsCount: Math.floor(Math.random() * 50) + 1,
          }));
        }
        // Se for array de objetos [{name, title, role}]
        else if (data.result.length > 0 && typeof data.result[0] === 'object') {
          communities = data.result.map((item: any) => ({
            name: item.name || '',
            title: item.title || item.name || '',
            role: item.role || 'guest',
            about: item.about || '',
            subscribers: Math.floor(Math.random() * 10000) + 100,
            postsCount: Math.floor(Math.random() * 50) + 1,
          }));
        }

        // Ordenar por papel (member primeiro, depois guest)
        const sortedCommunities = [...communities].sort((a, b) => {
          if (a.role === 'member' && b.role !== 'member') return -1;
          if (a.role !== 'member' && b.role === 'member') return 1;
          return a.title.localeCompare(b.title);
        });

        setUserCommunities(sortedCommunities);
      } else {
        setUserCommunities([]);
      }
    } catch (_error) {
      setUserCommunities([]);
    }
    setLoading(false);
  }

  // Atualizar comunidades do usuário ao montar ou mudar username
  useEffect(() => {
    fetchUserCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Buscar todas as comunidades do Hive
  useEffect(() => {
    if (!showExploreModal) return;
    setLoadingAll(true);
    fetch('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'bridge.list_communities',
        params: { last: '', limit: 100 },
        id: 1,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result && Array.isArray(data.result)) {
          setAllCommunities(
            data.result.map((c: any) => ({
              name: c.name,
              title: c.title || c.name,
              about: c.about,
              subscribers: c.subscribers,
              postsCount: c.num_posts,
              avatar_url: c.avatar_url,
            })),
          );
        } else {
          setAllCommunities([]);
        }
        setLoadingAll(false);
      })
      .catch(() => setLoadingAll(false));
  }, [showExploreModal]);

  // Função para gerar uma cor de fundo baseada no nome da comunidade
  const getCommunityColor = (name: string) => {
    const colors = [
      'bg-blue-600',
      'bg-purple-600',
      'bg-green-600',
      'bg-red-600',
      'bg-yellow-600',
      'bg-indigo-600',
      'bg-pink-600',
      'bg-teal-600',
    ];

    // Hash simples para gerar um índice consistente
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Função auxiliar para broadcast de operação de comunidade
  async function broadcastCommunityOperation(
    operations: Operation[],
    username: string,
    postingKey?: string,
  ) {
    // Log de depuração para identificar o valor de postingKey e Keychain
    if (typeof window !== 'undefined') {
      console.warn('[HiveCommunitiesSelector] postingKey:', postingKey, 'Keychain:', !!(window as any).hive_keychain);
    }
    // 1. Se for uma chave privada válida, assina e transmite localmente
    if (postingKey && /^5[HJK].{48,51}$/.test(postingKey)) {
      try {
        const client = new Client(['https://api.hive.blog']);
        const key = PrivateKey.fromString(postingKey);
        await client.broadcast.sendOperations(operations, key);
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(
          'Erro ao assinar/transmitir com a chave privada: ' + msg,
        );
        throw e;
      }
    }
    // 2. Se for uma chave criptografada, envia para o backend
    if (postingKey) {
      await sendHiveOperation(postingKey, operations);
      return true;
    }
    // 3. Se houver Keychain
    if (typeof window !== 'undefined' && (window as any).hive_keychain) {
      return new Promise((resolve, reject) => {
        (window as any).hive_keychain.requestBroadcast(
          username,
          operations,
          'Posting',
          (response: any) => {
            if (response.success) resolve(true);
            else reject(response.message || 'Erro ao executar operação');
          },
        );
      });
    }
    // 4. Se nada, alerta
    alert(
      'Nenhum método de autenticação encontrado.\n' +
      'Instale o Hive Keychain ou forneça sua chave privada para entrar/sair de comunidades.',
    );
    throw new Error('Sem método de autenticação');
  }

  // Função para entrar em uma comunidade
  async function handleJoinCommunity(community: string) {
    if (!username) return;
    const op: Operation = [
      'custom_json',
      {
        required_auths: [],
        required_posting_auths: [username],
        id: 'community',
        json: JSON.stringify(['subscribe', { community }]),
      },
    ];
    try {
      await broadcastCommunityOperation([op], username, postingKey);
      await fetchUserCommunities();
      setShowExploreModal(false);
      setShowCommunitiesModal(false);
    } catch (e: any) {
      alert('Erro ao entrar na comunidade: ' + (e.message || e));
    }
  }

  // Função para sair de uma comunidade
  async function handleLeaveCommunity(community: string) {
    if (!username) return;
    const op: Operation = [
      'custom_json',
      {
        required_auths: [],
        required_posting_auths: [username],
        id: 'community',
        json: JSON.stringify(['unsubscribe', { community }]),
      },
    ];
    try {
      await broadcastCommunityOperation([op], username, postingKey);
      await fetchUserCommunities();
      setShowExploreModal(false);
      setShowCommunitiesModal(false);
    } catch (e: any) {
      alert('Erro ao sair da comunidade: ' + (e.message || e));
    }
  }

  if (!username) return null;

  return (
    <div className="mb-8 flex flex-col gap-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
        {/* Botões de comunidades organizados e responsivos */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center items-stretch sm:items-center my-2">
          <button
            onClick={() => setShowCommunitiesModal(true)}
            className="flex-1 sm:flex-none border border-zinc-700 hover:border-zinc-400 text-zinc-400 hover:text-zinc-100 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all duration-150 font-mono text-xs bg-transparent min-w-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            minhas comunidades
          </button>
          <button
            onClick={() => setShowExploreModal(true)}
            className="flex-1 sm:flex-none border border-zinc-700 hover:border-zinc-400 text-zinc-400 hover:text-zinc-100 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all duration-150 font-mono text-xs bg-transparent min-w-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            explorar comunidades
          </button>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-400 justify-center sm:justify-end w-full sm:w-auto">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Carregando...
          </div>
        )}
      </div>


      {/* Modal de criação de post */}
      {showPostModal && selectedCommunityForPost && username && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => setShowPostModal(false)}
          />

          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Criar post na comunidade: <span className="text-blue-400">@{selectedCommunityForPost}</span>
              </h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="pt-2">
              {username && (
                <PinataMediaPostButton
                  username={username}
                  initialCommunity={selectedCommunityForPost}
                  onPostSuccess={() => {
                    setShowPostModal(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de seleção de comunidades (nova adição) */}
      {showCommunitiesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => setShowCommunitiesModal(false)}
          />
          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Selecione uma comunidade
              </h3>
              <button
                onClick={() => setShowCommunitiesModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {userCommunities.map((c) => (
                <button
                  key={c.name}
                  className={clsx(
                    'flex rounded-xl border transition overflow-hidden',
                    selectedCommunity === c.name
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                      : 'border-neutral-700 hover:border-blue-400',
                  )}
                  onClick={(e) => {
                    // Se clicar no botão "Ver Posts", não seleciona a comunidade
                    if ((e.target as HTMLElement).closest('.ver-posts-btn')) {
                      e.stopPropagation();
                      return;
                    }
                    setSelectedCommunity(c.name);
                    setSelectedCommunityForPost(c.name);
                    setShowPostModal(true);
                    setShowCommunitiesModal(false);
                  }}
                  title={c.about || c.title}
                >
                  <div className="flex flex-col sm:flex-row w-full">
                    {/* Banner da comunidade */}
                    <div
                      className={clsx(
                        'w-16 h-16 flex items-center justify-center text-white relative',
                        getCommunityColor(c.name),
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-center font-semibold text-shadow">
                        {c.title}
                      </div>
                    </div>
                    <div className="bg-neutral-900 p-3 flex flex-col gap-2 flex-grow">
                      {/* Informações da comunidade */}
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className={clsx(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            'text-white font-bold text-lg border-2',
                            c.role === 'member' ? 'border-blue-400' : 'border-neutral-600',
                            getCommunityColor(c.name),
                          )}
                        >
                          {c.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-base leading-tight">
                            {c.title}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            @{c.name}
                          </span>
                        </div>
                      </div>
                      {/* Estatísticas e role */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            {c.subscribers?.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                            {c.postsCount} posts
                          </span>
                        </div>
                        {c.role && (
                          <span
                            className={clsx(
                              'px-2 py-0.5 text-xs rounded-full',
                              c.role === 'guest'
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-blue-700 text-white font-medium',
                            )}
                          >
                            {c.role === 'guest' ? 'Convidado' : 'Membro'}
                          </span>
                        )}
                      </div>
                      {/* Botão Ver Posts */}
                      <div className="mt-2">
                        <button
                          className="ver-posts-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUserCommunityPosts(c);
                          }}
                        >
                          Ver Posts
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Posts das Comunidades do Usuário */}
      {showUserCommunityPostsModal && selectedUserCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => {
              setShowUserCommunityPostsModal(false);
              setSelectedUserCommunity(null);
              setUserCommunityPosts([]);
            }}
          />
          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx('w-12 h-12 flex items-center justify-center text-white rounded-full font-bold text-lg', getCommunityColor(selectedUserCommunity.name))}>
                  {selectedUserCommunity.title.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedUserCommunity.title}</h3>
                  <p className="text-sm text-gray-400 font-mono">@{selectedUserCommunity.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUserCommunityPostsModal(false);
                  setSelectedUserCommunity(null);
                  setUserCommunityPosts([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingUserCommunityPosts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                <p className="ml-3 text-gray-400">Carregando posts...</p>
              </div>
            ) : userCommunityPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Nenhum post encontrado nesta comunidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userCommunityPosts.map((post: any) => {
                  const postId = `${post.author}-${post.permlink}`;
                  const isExpanded = expandedUserPosts.has(postId);
                  const mediaItems = MarkdownRenderer.extractMediaFromHive(post);
                  const firstMedia = mediaItems[0];
                  
                  const toggleExpand = () => {
                    setExpandedUserPosts(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(postId)) {
                        newSet.delete(postId);
                      } else {
                        newSet.add(postId);
                      }
                      return newSet;
                    });
                  };
                  
                  return (
                    <div 
                      key={postId} 
                      className={clsx(
                        'bg-neutral-900 rounded-lg border border-gray-700 overflow-hidden transition-all duration-300 cursor-pointer',
                        isExpanded ? 'md:col-span-2 lg:col-span-3' : '',
                        'hover:border-gray-600',
                      )}
                      onClick={toggleExpand}
                    >
                      {/* Card Compacto (não expandido) */}
                      {!isExpanded && (
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-white">@{post.author}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">
                              {new Date(post.created).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          {firstMedia && (
                            <div className="mb-3 rounded-lg overflow-hidden">
                              {firstMedia.type === 'iframe' ? (
                                <div className="relative w-full aspect-square bg-black">
                                  <iframe
                                    src={firstMedia.url}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen"
                                    frameBorder="0"
                                  />
                                </div>
                              ) : firstMedia.type === 'video' ? (
                                <video
                                  src={firstMedia.url}
                                  className="w-full h-auto rounded-lg"
                                  onError={(e) => {
                                    (e.target as HTMLVideoElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <img
                                  src={firstMedia.url}
                                  alt={post.title}
                                  className="w-full h-auto rounded-lg object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          )}
                          
                          <h4 className="text-base font-bold text-white mb-2 line-clamp-2">{post.title}</h4>
                          
                          <div className="text-sm text-gray-300 line-clamp-2 mb-3">
                            {post.body.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '').substring(0, 150)}...
                          </div>
                          
                          {post.json_metadata && (() => {
                            try {
                              const metadata = JSON.parse(post.json_metadata);
                              const tags = (metadata.tags || []).slice(0, 3);
                              if (tags.length > 0) {
                                return (
                                  <div className="flex gap-1 flex-wrap">
                                    {tags.map((tag: string) => (
                                      <span key={tag} className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Card Expandido */}
                      {isExpanded && (
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">@{post.author}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-400">
                                {new Date(post.created).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand();
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          <h4 className="text-xl font-bold text-white mb-4">{post.title}</h4>

                          {/* Todas as Mídias */}
                          {mediaItems.length > 0 && (
                            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {mediaItems.map((media, idx) => (
                                <div key={idx}>
                                  {media.type === 'iframe' ? (
                                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black">
                                      <iframe
                                        src={media.url}
                                        className="w-full h-full"
                                        allow="autoplay; fullscreen"
                                        frameBorder="0"
                                      />
                                    </div>
                                  ) : media.type === 'video' ? (
                                    <video
                                      src={media.url}
                                      controls
                                      className="w-full h-auto rounded-lg"
                                    />
                                  ) : (
                                    <img
                                      src={media.url}
                                      alt={post.title}
                                      className="w-full h-auto rounded-lg object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Conteúdo Completo */}
                          <div className="prose prose-invert max-w-none mb-4">
                            <MarkdownRendererComponent>
                              {post.body}
                            </MarkdownRendererComponent>
                          </div>

                          {/* Tags Completas */}
                          {post.json_metadata && (() => {
                            try {
                              const metadata = JSON.parse(post.json_metadata);
                              const tags = metadata.tags || [];
                              if (tags.length > 0) {
                                return (
                                  <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-700">
                                    {tags.map((tag: string) => (
                                      <span key={tag} className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm border border-purple-600/30">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de exploração de comunidades */}
      {showExploreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => setShowExploreModal(false)}
          />
          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Explorar Comunidades
              </h3>
              <button
                onClick={() => setShowExploreModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar comunidade..."
              className="w-full mb-4 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
            />
            {loadingAll ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                <p className="ml-3 text-gray-400">Carregando comunidades...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {allCommunities.filter(c =>
                  c.title.toLowerCase().includes(search.toLowerCase()) ||
                  c.name.toLowerCase().includes(search.toLowerCase()),
                ).map((c) => {
                  const isMember = userCommunities.some(u => u.name === c.name && u.role === 'member');
                  const isGuest = userCommunities.some(u => u.name === c.name && u.role === 'guest');
                  return (
                    <div key={c.name} className="flex flex-col sm:flex-row items-start sm:items-center bg-neutral-900 rounded-lg border border-gray-700 p-4 gap-3 shadow hover:border-gray-600 transition-colors">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          handleOpenCommunityModal(c);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={clsx('w-14 h-14 flex items-center justify-center text-white rounded-full font-bold text-lg flex-shrink-0', getCommunityColor(c.name))}>
                            {c.title.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-base text-white hover:text-purple-400 transition-colors">{c.title}</div>
                            <div className="text-xs text-gray-400 font-mono">@{c.name}</div>
                            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{c.about}</div>
                            <div className="flex gap-4 mt-2 text-xs text-gray-400">
                              <span>{c.subscribers?.toLocaleString()} membros</span>
                              <span>{c.postsCount} posts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <button
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCommunityModal(c);
                          }}
                        >
                          Ver Posts
                        </button>
                        {isMember ? (
                          <button
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveCommunity(c.name);
                            }}
                          >
                            Sair
                          </button>
                        ) : isGuest ? (
                          <button
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveCommunity(c.name);
                            }}
                          >
                            Sair 
                          </button>
                        ) : (
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinCommunity(c.name);
                            }}
                          >
                            Entrar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Posts da Comunidade */}
      {showCommunityModal && selectedCommunityData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={() => {
              setShowCommunityModal(false);
              setSelectedCommunityData(null);
              setCommunityPosts([]);
            }}
          />
          <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx('w-12 h-12 flex items-center justify-center text-white rounded-full font-bold text-lg', getCommunityColor(selectedCommunityData.name))}>
                  {selectedCommunityData.title.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedCommunityData.title}</h3>
                  <p className="text-sm text-gray-400 font-mono">@{selectedCommunityData.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCommunityModal(false);
                  setSelectedCommunityData(null);
                  setCommunityPosts([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingPosts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                <p className="ml-3 text-gray-400">Carregando posts...</p>
              </div>
            ) : communityPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Nenhum post encontrado nesta comunidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communityPosts.map((post: any) => {
                  const postId = `${post.author}-${post.permlink}`;
                  const isExpanded = expandedPosts.has(postId);
                  const mediaItems = MarkdownRenderer.extractMediaFromHive(post);
                  const firstMedia = mediaItems[0];
                  
                  const toggleExpand = () => {
                    setExpandedPosts(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(postId)) {
                        newSet.delete(postId);
                      } else {
                        newSet.add(postId);
                      }
                      return newSet;
                    });
                  };
                  
                  return (
                    <div 
                      key={postId} 
                      className={clsx(
                        'bg-neutral-900 rounded-lg border border-gray-700 overflow-hidden transition-all duration-300 cursor-pointer',
                        isExpanded ? 'md:col-span-2 lg:col-span-3' : '',
                        'hover:border-gray-600',
                      )}
                      onClick={toggleExpand}
                    >
                      {/* Card Compacto (não expandido) */}
                      {!isExpanded && (
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-white">@{post.author}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">
                              {new Date(post.created).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          
                          {firstMedia && (
                            <div className="mb-3 rounded-lg overflow-hidden">
                              {firstMedia.type === 'iframe' ? (
                                <div className="relative w-full aspect-square bg-black">
                                  <iframe
                                    src={firstMedia.url}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen"
                                    frameBorder="0"
                                  />
                                </div>
                              ) : firstMedia.type === 'video' ? (
                                <video
                                  src={firstMedia.url}
                                  className="w-full h-auto rounded-lg"
                                  onError={(e) => {
                                    (e.target as HTMLVideoElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <img
                                  src={firstMedia.url}
                                  alt={post.title}
                                  className="w-full h-auto rounded-lg object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          )}
                          
                          <h4 className="text-base font-bold text-white mb-2 line-clamp-2">{post.title}</h4>
                          
                          <div className="text-sm text-gray-300 line-clamp-2 mb-3">
                            {post.body.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img[^>]*>/g, '').substring(0, 150)}...
                          </div>
                          
                          {post.json_metadata && (() => {
                            try {
                              const metadata = JSON.parse(post.json_metadata);
                              const tags = (metadata.tags || []).slice(0, 3);
                              if (tags.length > 0) {
                                return (
                                  <div className="flex gap-1 flex-wrap">
                                    {tags.map((tag: string) => (
                                      <span key={tag} className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Card Expandido */}
                      {isExpanded && (
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">@{post.author}</span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-400">
                                {new Date(post.created).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand();
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          <h4 className="text-xl font-bold text-white mb-4">{post.title}</h4>

                          {/* Todas as Mídias */}
                          {mediaItems.length > 0 && (
                            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {mediaItems.map((media, idx) => (
                                <div key={idx}>
                                  {media.type === 'iframe' ? (
                                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black">
                                      <iframe
                                        src={media.url}
                                        className="w-full h-full"
                                        allow="autoplay; fullscreen"
                                        frameBorder="0"
                                      />
                                    </div>
                                  ) : media.type === 'video' ? (
                                    <video
                                      src={media.url}
                                      controls
                                      className="w-full h-auto rounded-lg"
                                    />
                                  ) : (
                                    <img
                                      src={media.url}
                                      alt={post.title}
                                      className="w-full h-auto rounded-lg object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Conteúdo Completo */}
                          <div className="prose prose-invert max-w-none mb-4">
                            <MarkdownRendererComponent>
                              {post.body}
                            </MarkdownRendererComponent>
                          </div>

                          {/* Tags Completas */}
                          {post.json_metadata && (() => {
                            try {
                              const metadata = JSON.parse(post.json_metadata);
                              const tags = metadata.tags || [];
                              if (tags.length > 0) {
                                return (
                                  <div className="flex gap-2 flex-wrap pt-4 border-t border-gray-700">
                                    {tags.map((tag: string) => (
                                      <span key={tag} className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm border border-purple-600/30">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Adiciona estilo global para text-shadow apenas no cliente
function useTextShadowStyle() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '.text-shadow { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
}
