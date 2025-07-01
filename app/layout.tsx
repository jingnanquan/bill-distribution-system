// app/layout.tsx
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: '字幕组项目管理系统',
  description: '管理项目、人员与账单的系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-gray-800">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
