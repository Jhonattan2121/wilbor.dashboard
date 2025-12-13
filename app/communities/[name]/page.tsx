'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx/lite';
import ViewSwitcher from '@/app/ViewSwitcher';

interface HiveCommunity {
  name: string;
  title: string;
  about?: string;
  subscribers?: number;
  avatar_url?: string;
  role?: string;
  postsCount?: number;
  admins?: string[];
  moderators?: string[];
  description?: string;
}

export default function CommunityPage() {
  const params = useParams();
  const router = useRouter();
  const communityName = params.name as string;
  const [community, setCommunity] = useState<HiveCommunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('dashboard_loginUser') : null;
    setUsername(user);
  }, []);

  useEffect(() => {
    if (!communityName) return;

    // Buscar detalhes da comunidade
    fetch('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'bridge.get_community',
        params: { name: communityName },
        id: 1,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          setCommunity({
            name: data.result.name,
            title: data.result.title || data.result.name,
            about: data.result.about,
            description: data.result.description,
            subscribers: data.result.subscribers,
            postsCount: data.result.num_posts,
            avatar_url: data.result.avatar_url,
            admins: data.result.admins || [],
            moderators: data.result.moderators || [],
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Verificar se o usuário é membro
    if (username) {
      fetch(`https://api.hive.blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.list_community_roles',
          params: { community: communityName },
          id: 1,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.result) {
            const userRole = data.result.find((r: any) => r.account === username);
            if (userRole) {
              setIsMember(userRole.role === 'member');
              setIsGuest(userRole.role === 'guest');
            }
          }
        })
        .catch(() => {});
    }
  }, [communityName, username]);

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
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="mt-4 text-gray-400">Carregando comunidade...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-400">Comunidade não encontrada</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-start min-h-screen">
      <ViewSwitcher currentSelection="projects" />
      
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Header da Comunidade */}
        <div className="bg-[#18181b] rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={clsx(
              'w-20 h-20 flex items-center justify-center text-white rounded-full font-bold text-2xl',
              getCommunityColor(community.name)
            )}>
              {community.title.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">{community.title}</h1>
              <p className="text-sm text-gray-400 font-mono mb-2">@{community.name}</p>
              {community.about && (
                <p className="text-gray-300 mb-4">{community.about}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <span>{community.subscribers?.toLocaleString() || 0} membros</span>
                <span>{community.postsCount || 0} posts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Descrição Detalhada */}
        {community.description && (
          <div className="bg-[#18181b] rounded-xl border border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Sobre a Comunidade</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap">{community.description}</p>
            </div>
          </div>
        )}

        {/* Administradores e Moderadores */}
        {(community.admins?.length || community.moderators?.length) && (
          <div className="bg-[#18181b] rounded-xl border border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Equipe</h2>
            {community.admins && community.admins.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Administradores</h3>
                <div className="flex flex-wrap gap-2">
                  {community.admins.map((admin) => (
                    <span
                      key={admin}
                      className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-sm border border-red-600/30"
                    >
                      @{admin}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {community.moderators && community.moderators.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Moderadores</h3>
                <div className="flex flex-wrap gap-2">
                  {community.moderators.map((mod) => (
                    <span
                      key={mod}
                      className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm border border-blue-600/30"
                    >
                      @{mod}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        {username && (
          <div className="bg-[#18181b] rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Ações</h2>
            <div className="flex flex-wrap gap-3">
              {isMember || isGuest ? (
                <button
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                  onClick={() => {
                    // Implementar lógica de sair da comunidade
                    alert('Funcionalidade de sair da comunidade será implementada');
                  }}
                >
                  Sair da Comunidade
                </button>
              ) : (
                <button
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                  onClick={() => {
                    // Implementar lógica de entrar na comunidade
                    alert('Funcionalidade de entrar na comunidade será implementada');
                  }}
                >
                  Entrar na Comunidade
                </button>
              )}
              <button
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                onClick={() => router.push(`/dashboard?community=${community.name}`)}
              >
                Criar Post nesta Comunidade
              </button>
            </div>
          </div>
        )}

        {/* Botão Voltar */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

