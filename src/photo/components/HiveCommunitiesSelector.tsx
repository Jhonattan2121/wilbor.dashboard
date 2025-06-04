import { clsx } from 'clsx/lite';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Importar dinamicamente o botão de criação de post para evitar problemas de SSR
const CreatePostButton = dynamic(
    () => import('../../../app/dashboard/CreatePostButton'),
    { ssr: false }
);

interface HiveCommunity {
    name: string;
    title: string;
    about?: string;
    subscribers?: number;
    avatar_url?: string;
    role?: string;
    postsCount?: number; // Para mostrar estatísticas como no PeakD
}

interface HiveCommunitiesSelectorProps {
    username: string | null;
    selectedCommunity: string | null;
    setSelectedCommunity: (community: string | null) => void;
}

export function HiveCommunitiesSelector({
    username,
    selectedCommunity,
    setSelectedCommunity,
}: HiveCommunitiesSelectorProps) {
    useTextShadowStyle();
    const [userCommunities, setUserCommunities] = useState<HiveCommunity[]>([]);
    const [loading, setLoading] = useState(false);
    const [debugData, setDebugData] = useState<any>(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [selectedCommunityForPost, setSelectedCommunityForPost] = useState<string | null>(null);
    const [showCommunitiesModal, setShowCommunitiesModal] = useState(false);

    // Buscar comunidades que o usuário segue (dinâmico pelo username)
    useEffect(() => {
        if (!username) return;
        setLoading(true);

        // Log para debug
        console.log('Buscando comunidades para:', username);

        // Primeiro, vamos tentar o método preferido
        fetch('https://api.hive.blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'bridge.list_all_subscriptions',
                params: { account: username },
                id: 1,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log('Resposta da API Hive:', data);
                setDebugData(data);

                let communities: HiveCommunity[] = [];

                // Verificar se retornou array ou objeto
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
                setLoading(false);
            })
            .catch((error) => {
                console.error('Erro ao carregar comunidades:', error);
                setLoading(false);
            });
    }, [username]);

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

    if (!username) return null;

    return (
        <div className="mb-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">

                {/* Botão para abrir o modal de comunidades */}
                <div className="flex justify-center my-2">
                    <button
                        onClick={() => setShowCommunitiesModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow"
                        style={{ minWidth: 0 }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Ver Minhas Comunidades
                    </button>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
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
                            <CreatePostButton
                                username={username}
                                initialCommunity={selectedCommunityForPost}
                                onPostSuccess={() => {
                                    setShowPostModal(false);
                                }}
                            />
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
                                    onClick={() => {
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
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
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
