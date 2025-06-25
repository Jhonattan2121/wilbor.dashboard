"use client";

import PhotoGridPage from '@/photo/PhotoGridPage';
import { useEffect, useState } from 'react';
import CreatePostButton from './CreatePostButton';
import HiveLogin from './HiveLogin';

export default function DashboardProjectsClient({ posts, photosCount, cameras, simulations }: any) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState<string | null>(null);
  const [postingKey, setPostingKey] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Restaurar login do localStorage ao carregar
  useEffect(() => {
    const storedLoggedIn = localStorage.getItem('dashboard_loggedIn');
    const storedUser = localStorage.getItem('dashboard_loginUser');
    const storedKey = localStorage.getItem('dashboard_postingKey');
    if (storedLoggedIn === 'true' && storedUser) {
      setLoggedIn(true);
      setLoginUser(storedUser);
      if (storedKey) setPostingKey(storedKey);
    }
    setLoadingAuth(false);
  }, []);

  function handleLogin(username: string, keyType: 'keychain' | 'private', key?: string) {
    setLoggedIn(true);
    setLoginUser(username);
    localStorage.setItem('dashboard_loggedIn', 'true');
    localStorage.setItem('dashboard_loginUser', username);
    if (key && keyType === 'private') {
      setPostingKey(key);
      localStorage.setItem('dashboard_postingKey', key);
    } else {
      setPostingKey(null);
      localStorage.removeItem('dashboard_postingKey');
    }
  }

  if (loadingAuth) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black/70">
        <span className="text-white text-sm opacity-60">Carregando...</span>
      </div>
    );
  }
  if (!loggedIn) {
    return <HiveLogin onLogin={handleLogin} />;
  }

  function handleLogout() {
    setLoggedIn(false);
    setLoginUser(null);
    setPostingKey(null);
    localStorage.removeItem('dashboard_loggedIn');
    localStorage.removeItem('dashboard_loginUser');
    localStorage.removeItem('dashboard_postingKey');
  }

  return (
    <div>
      <div
        className="flex flex-row items-center justify-between p-4 gap-2 md:gap-8 md:px-8 md:py-6"
      >
        <div className="flex flex-row items-center gap-2 md:gap-4">
          {loginUser && (
            <CreatePostButton
              username={loginUser}
              postingKey={postingKey || undefined}
            />
          )}
        </div>
        <div className="flex flex-row items-center gap-2 md:gap-4 md:bg-zinc-900 md:rounded-lg md:px-4 md:py-2 md:shadow-lg">
          <span className="text-sm text-gray-400 whitespace-nowrap md:text-base md:text-gray-200">
            Logado como <b className="font-mono md:font-bold">{loginUser}</b>
          </span>
          <button
            className="text-xs text-red-400 border border-red-400 rounded px-2 py-1 hover:bg-red-400 hover:text-white transition md:text-sm md:px-3 md:py-1.5 md:border-2 md:rounded-md"
            onClick={handleLogout}
            title="Sair"
          >
            Sair
          </button>
        </div>
      </div>
   
      <PhotoGridPage
        photos={posts}
        photosCount={photosCount}
        tags={[]}
        cameras={cameras}
        simulations={simulations}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        username={loginUser}
        postingKey={postingKey}
        isEditMode={true}
      />
    </div>
  );
}