import React from 'react';
import { Sidebar } from './Sidebar';
import type { Page } from '../types';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
