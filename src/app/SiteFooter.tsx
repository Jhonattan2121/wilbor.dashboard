'use client';

import { useEffect, useState } from 'react';

export default function SiteFooter() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(!!localStorage.getItem('dashboard_loginUser'));
    sync();
    window.addEventListener('dashboard_auth_changed', sync);
    return () => window.removeEventListener('dashboard_auth_changed', sync);
  }, []);

  return (
    <footer className="w-full border-t border-zinc-800/50 bg-zinc-950/80">
      <div className="flex flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6 lg:px-10 py-4">
        <span className="font-mono text-sm text-zinc-600 select-none">
          wilbor.art © {new Date().getFullYear()}
        </span>
        {loggedIn && (
          <a
            href="/footer"
            className="edit-btn-attention flex items-center min-h-[44px] px-4 rounded-lg
                       font-mono text-sm border border-zinc-600 bg-black/80 text-zinc-200
                       hover:border-white hover:text-white hover:bg-zinc-900
                       active:border-white active:text-white active:bg-zinc-800
                       transition-all duration-150"
          >
            editar rodapé do site
          </a>
        )}
      </div>
    </footer>
  );
}
