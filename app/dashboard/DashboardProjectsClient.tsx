'use client';

import PhotoGridPage from '@/photo/PhotoGridPage';
import { useEffect, useState } from 'react';
import PinataMediaPostButton from './PinataMediaPostButton';
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
    window.dispatchEvent(new Event('dashboard_auth_changed'));
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

  return (
    <div>
      <div className="p-4 md:px-8 md:py-6">
        {loginUser && (
          <PinataMediaPostButton
            username={loginUser}
            postingKey={postingKey || undefined}
          />
        )}
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