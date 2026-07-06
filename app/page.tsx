'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { ChatArea } from '@/components/chat/chat-area';
import { LegalToolkit } from '@/components/toolkit/legal-toolkit';
import { ProductTour } from '@/components/onboarding/product-tour';
import { LandingPage } from '@/components/landing-page';
import { useChats } from '@/hooks/use-chats';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { Scale } from 'lucide-react';

type TransitionState = 'idle' | 'transitioning-to-chat' | 'chat' | 'transitioning-to-home';

export default function Home() {
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const { theme } = useTheme();
  
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isToolkitMobileOpen, setIsToolkitMobileOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { t } = useChats();

  // Resizable Right Panel Width (Min: 260px, Max: 480px, Default: 320px)
  const [toolkitWidth, setToolkitWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lexiguard-toolkit-width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 260 && parsed <= 480) {
        setToolkitWidth(parsed);
      }
    }
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 260 && newWidth <= 480) {
        setToolkitWidth(newWidth);
        localStorage.setItem('lexiguard-toolkit-width', newWidth.toString());
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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
    setIsToolkitMobileOpen(false); // Make sure to close drawer when finished
  }, []);

  const handleStepChange = useCallback((stepIndex: number) => {
    // Steps 3, 4, 5 (indices 2, 3, 4) target the toolkit dashboard
    if (stepIndex >= 2) {
      setIsToolkitMobileOpen(true);
    } else {
      setIsToolkitMobileOpen(false);
    }
  }, []);

  const handleStartAnalysis = useCallback(() => {
    setTransitionState('transitioning-to-chat');
    setTimeout(() => {
      setTransitionState('chat');
    }, 1400); // 1.4s duration to let premium animations play fully
  }, []);

  const handleGoHome = useCallback(() => {
    setTransitionState('transitioning-to-home');
    setTimeout(() => {
      setTransitionState('idle');
    }, 1400); // 1.4s duration for reverse transition
  }, []);

  const showLandingPage = transitionState === 'idle';
  const showTransitionOverlay = transitionState === 'transitioning-to-chat' || transitionState === 'transitioning-to-home';
  const showChatArea = transitionState === 'chat';

  // Adaptive background styles for Transition Overlay
  const isLightMode = theme === 'light';

  return (
    <>
      {/* Global CSS Style Declarations for Premium Custom Transitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes logoScaleUp {
          0% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0)); }
          100% { transform: scale(2.8) rotate(360deg); filter: drop-shadow(0 0 60px rgba(99, 102, 241, 0.95)); }
        }
        @keyframes logoScaleDown {
          0% { transform: scale(2.8) rotate(360deg); filter: drop-shadow(0 0 60px rgba(99, 102, 241, 0.95)); }
          100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0)); }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(40px); opacity: 0; }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(6); opacity: 0; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.35s ease-in forwards;
        }
        .animate-logo-scale-up {
          animation: logoScaleUp 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-logo-scale-down {
          animation: logoScaleDown 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-down {
          animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-ripple {
          animation: ripple 0.6s linear forwards;
        }
      `}</style>

      {/* 1. Landing Page State */}
      {showLandingPage && (
        <div className="h-screen w-screen overflow-y-auto custom-scrollbar relative">
          <LandingPage onStartAnalysis={handleStartAnalysis} />
        </div>
      )}

      {/* 2. Transition Overlay (Dual Direction) */}
      {showTransitionOverlay && (
        <div className={cn(
          "fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-fade-in transition-all duration-1000",
          isLightMode 
            ? "bg-gradient-to-tr from-white via-slate-50 to-orange-50/30 text-slate-900" 
            : "bg-[#08070B] text-white"
        )}>
          {/* Ambient Lighting Gradients */}
          {isLightMode ? (
            <>
              <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />
            </>
          )}

          <div className="relative flex flex-col items-center space-y-7">
            {/* Soft backdrop glow behind logo */}
            <div className="absolute inset-0 w-44 h-44 bg-indigo-500/35 rounded-full blur-3xl animate-pulse" />
            
            {/* Logo scale, spin, and glowing backlight */}
            <div className={cn(
              "relative p-6 bg-gradient-to-tr from-purple-600 to-orange-500 rounded-3xl text-white shadow-2xl shadow-purple-600/30",
              transitionState === 'transitioning-to-chat' ? 'animate-logo-scale-up' : 'animate-logo-scale-down'
            )}>
              <Scale className="size-10" />
            </div>
            
            <div className="pt-20 flex flex-col items-center space-y-2 text-center z-10">
              <h2 className="text-xl font-black tracking-widest uppercase animate-pulse">
                LexiGuard
              </h2>
              <p className="text-xs text-indigo-400 font-bold tracking-wider">
                {transitionState === 'transitioning-to-chat' 
                  ? 'Initializing Secure AI Workspace...' 
                  : 'Deconstructing Secure AI Workspace...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Chat Workspace */}
      {showChatArea && (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-slide-up">
          {/* Left Sidebar Navigation */}
          <Sidebar 
            isOpenOnMobile={isSidebarMobileOpen} 
            setIsOpenOnMobile={setIsSidebarMobileOpen} 
          />

          {/* Center Chat Area Viewport */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            <ChatArea 
              onToggleSidebarMobile={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
              onToggleToolkitMobile={() => setIsToolkitMobileOpen(!isToolkitMobileOpen)}
              isToolkitOpenMobile={isToolkitMobileOpen}
              onGoHome={handleGoHome}
            />
          </div>

          {/* Draggable divider between chat and toolkit (desktop only) */}
          <div
            onMouseDown={startResizing}
            className={cn(
              "hidden xl:block w-1.5 cursor-col-resize hover:bg-purple-500/30 transition-colors duration-150 shrink-0 h-full z-50",
              isResizing ? "bg-purple-600/50" : "bg-border/30 border-l border-border/10"
            )}
          />

          {/* Right Legal Toolkit Dashboard */}
          <aside 
            className="hidden xl:block shrink-0 h-full"
            style={{ width: `${toolkitWidth}px` }}
          >
            <LegalToolkit 
              isOpenOnMobile={isToolkitMobileOpen}
              setIsOpenOnMobile={setIsToolkitMobileOpen}
            />
          </aside>

          {/* Mobile Drawer (visible on smaller screens when toggled) */}
          <div className="xl:hidden">
            <LegalToolkit 
              isOpenOnMobile={isToolkitMobileOpen}
              setIsOpenOnMobile={setIsToolkitMobileOpen}
            />
          </div>

          {/* Product Tour Overlay */}
          {isTourOpen && (
            <ProductTour 
              isOpen={isTourOpen}
              onClose={handleTourClose}
              t={t}
              onStepChange={handleStepChange}
            />
          )}
        </div>
      )}
    </>
  );
}
