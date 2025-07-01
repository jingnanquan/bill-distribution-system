'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const role = session?.user?.role;
      if (role === 'admin') {
        router.replace('/admin');
      } else if (role === 'manager') {
        router.replace('/manager');
      } else if (role === 'member') {
        router.replace('/member');
      }
    }
  }, [status, session, router]);

  if (status === 'loading') return <p className="p-4">加载中...</p>;
  if (!session) return <p className="p-4">未登录，请先 <a href="/login" className="text-blue-500 underline">登录</a></p>;

  return <p className="p-4">正在跳转...</p>;
}
