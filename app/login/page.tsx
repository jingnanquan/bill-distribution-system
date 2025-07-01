'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    await signIn('credentials', {
      redirect: true,
      username,
      password,
      callbackUrl: '/',
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-xl mb-4">用户登录</h1>
      <input className="block mb-2 border px-2 py-1" placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} />
      <input className="block mb-2 border px-2 py-1" placeholder="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleLogin}>登录</button>
    </div>
  );
}
