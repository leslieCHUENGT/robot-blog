import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { initializePostManager } from '@/lib/docs-manager';
import { appConfig } from '@/app-config';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { BackToTop } from '@/components/back-to-top';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: appConfig.title,
  description: appConfig.description,
  keywords: [
    'Leslie',
    '前端开发',
    'Vue',
    'React',
    'TypeScript',
    'Node.js',
    '个人博客',
    '技术文章',
    'Web开发',
    '软件工程'
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    type: 'website', // 内容类型：网站
    locale: 'zh_CN', // 语言区域：简体中文
    url: appConfig.siteUrl, // 网站URL
    title: appConfig.title, // 分享标题
    description: appConfig.description, // 分享描述
    siteName: appConfig.title || 'Leslie', // 网站名称
    images: [
      {
        url: appConfig.me.avatar,
        width: 1200,
        height: 630,
        alt: `${appConfig.me.name}的头像`
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: appConfig.title,
    description: appConfig.description,
    images: [appConfig.me.avatar]
  },
  category: '个人博客'
};

await initializePostManager(appConfig.srcDir);

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="pink" suppressHydrationWarning>
      <head></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <BackToTop />
        <ThemeSwitcher />
      </body>
    </html>
  );
}
