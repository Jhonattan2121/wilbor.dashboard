
"use client";

import PhotosEmptyState from '@/photo/PhotosEmptyState';
import { useEffect, useState } from 'react';
import DashboardProjectsClient from './DashboardProjectsClient';

export default function DashboardPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const username = process.env.NEXT_PUBLIC_HIVE_USERNAME;

  useEffect(() => {
    async function fetchPosts() {
      if (!username) return;
      const res = await fetch('/api/hive-posts?username=' + encodeURIComponent(username));
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
      setLoading(false);
    }
    fetchPosts();
  }, [username]);

  if (!username) return <PhotosEmptyState />;
  if (loading) return <div className="w-full h-screen flex items-center justify-center bg-black/70"><span className="text-white text-sm opacity-60">Carregando...</span></div>;
  return <DashboardProjectsClient posts={posts} photosCount={posts.length} cameras={[]} simulations={[]} />;
}