import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Add padding-top for fixed navbar, except on home page which handles it in hero */}
      <main className={`flex-1 ${!isHomePage ? 'pt-16' : ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
