'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const ASCII_CHARS = '!<>-_\\/[]{}=+*^?#@$%&';

function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleMouseEnter() {
    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplay(
        text.split('').map((char, index) => {
          if (char === '.' || char === ' ') return char;
          if (index < Math.floor(iteration)) return char;
          return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
        }).join('')
      );
      iteration += 0.4;
      if (iteration >= text.length) {
        clearInterval(intervalRef.current!);
        setDisplay(text);
      }
    }, 40);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return <span className={className} onMouseEnter={handleMouseEnter}>{display}</span>;
}
import {
  Path_Contact,
  Path_Exhibitions,
  Path_Footer,
  PATH_FEED_INFERRED,
  Path_Partners,
} from '@/app/paths';

export type SwitcherSelection =
  'projects' | 'about' | 'exhibitions' | 'partners' | 'contact' | 'footer';

const NAV_ITEMS = [
  { label: 'dashboard',  short: 'dashboard',  href: '/dashboard',       key: 'projects'    },
  { label: 'sobre',      short: 'sobre',      href: PATH_FEED_INFERRED, key: 'about'       },
  { label: 'exposições', short: 'expo',       href: Path_Exhibitions,   key: 'exhibitions' },
  { label: 'parceiros',  short: 'parceiros',  href: Path_Partners,      key: 'partners'    },
  { label: 'contato',    short: 'contato',    href: Path_Contact,       key: 'contact'     },
  { label: 'footer',     short: 'footer',     href: Path_Footer,        key: 'footer'      },
] as const;

export default function ViewSwitcher({
  currentSelection,
  showAdmin: _showAdmin,
  drawerTagsProps: _drawerTagsProps,
  tags: _tags,
}: {
  currentSelection?: SwitcherSelection
  tags?: unknown
  showAdmin?: boolean
  drawerTagsProps?: {
    tags: string[]
    selectedTag: string | null
    setSelectedTag?: (tag: string | null) => void
  }
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('dashboard_loginUser'));
    const sync = () => setUsername(localStorage.getItem('dashboard_loginUser'));
    window.addEventListener('dashboard_auth_changed', sync);
    return () => window.removeEventListener('dashboard_auth_changed', sync);
  }, []);

  function handleLogout() {
    localStorage.removeItem('dashboard_loggedIn');
    localStorage.removeItem('dashboard_loginUser');
    localStorage.removeItem('dashboard_postingKey');
    window.location.href = '/dashboard';
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Glass bar */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50" />

      {/* Main row */}
      <div className="relative flex items-center justify-between h-14 px-4 sm:px-6 lg:px-10">

        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Wilbor — página inicial"
        >
          <Image
            src="/favicons/FAVCOM_WILBOR.png"
            alt=""
            width={30}
            height={30}
            className="rounded-xl transition-opacity group-hover:opacity-80"
          />
          <ScrambleText
            text="wilbor.art"
            className="font-mono text-sm font-semibold text-white tracking-tight hidden xs:block select-none"
          />
        </a>

        {/* Desktop links */}
        <nav aria-label="Navegação principal" className="hidden sm:flex items-center gap-0.5">
          {NAV_ITEMS.map(({ label, href, key }) => {
            const active = currentSelection === key;
            return (
              <a
                key={key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative px-3.5 py-1.5 rounded-lg text-sm font-mono tracking-tight transition-all duration-150',
                  active
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
                ].join(' ')}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[1px] w-4 h-[2px] rounded-full bg-white/60" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Desktop user section */}
        {username && (
          <div className="hidden sm:flex items-center gap-2.5 pl-4 ml-1 border-l border-zinc-800">
            <span className="text-xs font-mono text-zinc-400 select-none">
              <span className="text-zinc-600">@</span>{username}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-mono px-2 py-1 rounded-md text-zinc-500
                         hover:text-red-400 hover:bg-red-950/40 transition-all duration-150"
            >
              sair
            </button>
          </div>
        )}

        {/* Mobile toggle */}
        <button
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg
                     text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Navegação móvel"
          className="relative sm:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-md"
        >
          <ul className="flex flex-col py-1.5">
            {NAV_ITEMS.map(({ label, short, href, key }) => {
              const active = currentSelection === key;
              return (
                <li key={key}>
                  <a
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={[
                      'flex items-center gap-3 px-5 py-3 text-sm font-mono tracking-tight',
                      'border-l-2 transition-all duration-150',
                      active
                        ? 'border-white text-white bg-zinc-800/40'
                        : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/25 hover:border-zinc-600',
                    ].join(' ')}
                  >
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </a>
                </li>
              );
            })}
            {/* Mobile user row */}
            {username && (
              <li className="border-t border-zinc-800/50 mt-1">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-mono text-zinc-500 select-none">
                    <span className="text-zinc-700">@</span>{username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors duration-150"
                  >
                    sair
                  </button>
                </div>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
