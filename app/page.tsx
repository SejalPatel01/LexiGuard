'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { ChatArea } from '@/components/chat/chat-area';
import { LegalToolkit } from '@/components/toolkit/legal-toolkit';
import { ProductTour } from '@/components/onboarding/product-tour';
import { useChats } from '@/hooks/use-chats';

export default function Home() {
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isToolkitMobileOpen, setIsToolkitMobileOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { t } = useChats();

  // Auto-start tour on first visit
  useEffect(() => {
    const completed = localStorage.getItem('nyaya-tour-completed');
    if (!completed) {
      // Small delay to let the layout render first
      const timer = setTimeout(() => setIsTourOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for relaunch tour event from Help menu
  useEffect(() => {
    const handleRelaunch = () => {
      setIsTourOpen(true);
    };
    window.addEventListener('nyaya-relaunch-tour', handleRelaunch);
    return () => window.removeEventListener('nyaya-relaunch-tour', handleRelaunch);
  }, []);

  const handleTourClose = useCallback(() => {
    setIsTourOpen(false);
    localStorage.setItem('nyaya-tour-completed', 'true');
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        isOpenOnMobile={isSidebarMobileOpen} 
        setIsOpenOnMobile={setIsSidebarMobileOpen} 
      />

      {/* 2. Center Chat Area Viewport */}
      <ChatArea 
        onToggleSidebarMobile={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
        onToggleToolkitMobile={() => setIsToolkitMobileOpen(!isToolkitMobileOpen)}
        isToolkitOpenMobile={isToolkitMobileOpen}
      />

      {/* 3. Right Legal Toolkit Dashboard */}
      <LegalToolkit 
        isOpenOnMobile={isToolkitMobileOpen}
        setIsOpenOnMobile={setIsToolkitMobileOpen}
      />

      {/* 4. Product Tour Overlay */}
      <ProductTour 
        isOpen={isTourOpen}
        onClose={handleTourClose}
        t={t}
      />
    </div>
  );
}
