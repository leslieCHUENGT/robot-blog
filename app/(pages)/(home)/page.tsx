import FeaturedPosts from '@/components/home/featured-posts';
import Header from '@/components/layout/header';
import Hero from '@/components/home/hero';
import CategoryList from '@/components/home/category-list';
import { getPostManager } from '@/lib/docs-manager';
import { appConfig } from '@/app-config';
import RobotPage from '@/components/robot';

// 强制页面使用静态生成
// export const dynamic = 'force-static';

// 可选：添加生成元数据
export const metadata = {
  title: appConfig.title,
  description: appConfig.description
};
export default async function Home() {
  const postManager = getPostManager();

  const featuredPosts = postManager.getFeaturedPosts(5);
  const categories = postManager.getAllCategories();
  return (
    <>
      <Header currentPath="/" />
      <RobotPage />
      <Hero />
      <FeaturedPosts posts={featuredPosts} />
      <CategoryList categories={categories} />
    </>
  );
}
