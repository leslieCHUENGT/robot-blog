import Footer from '@/components/layout/footer';

export default async function HeaderNavLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-background relative mx-auto flex min-h-screen flex-col px-5 xl:max-w-[1200px]">
      {children}
      <Footer />
    </div>
  );
}
