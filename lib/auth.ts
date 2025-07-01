// lib/auth.ts
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import db from './db';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET ?? 'devsecret',

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const { username, password } = credentials;

        const admin = db
          .prepare(
            `SELECT * FROM admin_users WHERE username = ? AND password = ?`,
          )
          .get(username, password);
        if (admin)
          return { id: admin.id, name: admin.name, role: 'admin' } as any;

        const manager = db
          .prepare(
            `SELECT * FROM manager_users WHERE username = ? AND password = ?`,
          )
          .get(username, password);
        if (manager)
          return { id: manager.id, name: manager.name, role: 'manager' } as any;

        const member = db
          .prepare(
            `SELECT * FROM member_users WHERE username = ? AND password = ?`,
          )
          .get(username, password);
        if (member)
          return { id: member.id, name: member.name, role: 'member' } as any;

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ? Number(token.sub) : undefined;
        session.user.role = token.role as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  pages: { signIn: '/login' },
};
