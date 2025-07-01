import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import db from '@/lib/db';

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        const { username, password } = credentials;

        const admin = db.prepare(`SELECT * FROM admin_users WHERE username = ? AND password = ?`).get(username, password);
        if (admin) return { id: admin.id, name: admin.name, role: 'admin' };

        const manager = db.prepare(`SELECT * FROM manager_users WHERE username = ? AND password = ?`).get(username, password);
        if (manager) return { id: manager.id, name: manager.name, role: 'manager' };

        const member = db.prepare(`SELECT * FROM member_users WHERE username = ? AND password = ?`).get(username, password);
        if (member) return { id: member.id, name: member.name, role: 'member' };

        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.role = token.role;
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'devsecret',
};

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
