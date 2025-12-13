import {
  BASE_URL,
  DEFAULT_THEME,
  SITE_DESCRIPTION,
  SITE_TITLE
} from '@/app/config';
import AppStateProvider from '@/state/AppStateProvider';
import SwrConfigClient from '@/state/SwrConfigClient';
import ToasterWithThemes from '@/toast/ToasterWithThemes';
import { ThemeProvider } from 'next-themes';
import '../tailwind.css';
import JsonLd from './components/JsonLd';
import DashboardPage from './dashboard/page';
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get('x-invoke-path') || '';
  const isDashboard = pathname === '/' || pathname === '/dashboard';
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/png" href="/favicons/FAVCOM_WILBOR.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/favicon.png" />
      </head>
      <body className="bg-main">
        <AppStateProvider>
          <ThemeProvider attribute="class" defaultTheme={DEFAULT_THEME}>
            <SwrConfigClient>
              {isDashboard ? <DashboardPage /> : children}
            </SwrConfigClient>
            <ToasterWithThemes />
            <JsonLd type="website" />
          </ThemeProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
