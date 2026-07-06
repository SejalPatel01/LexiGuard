'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChats } from '@/hooks/use-chats';
import { useTheme } from '@/hooks/use-theme';
import { 
  Scale, 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  Sun, 
  Moon, 
  PanelLeft, 
  PanelLeftClose, 
  X,
  MoreVertical,
  Pin,
  PinOff,
  Edit3,
  HelpCircle,
  RotateCcw,
  Gavel,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { transliterateToEnglish, stripVowels } from '@/lib/transliterate';

interface SidebarProps {
  isOpenOnMobile: boolean;
  setIsOpenOnMobile: (open: boolean) => void;
}

export function Sidebar({ isOpenOnMobile, setIsOpenOnMobile }: SidebarProps) {
  const { 
    chats, 
    activeChatId, 
    searchQuery, 
    setSearchQuery, 
    createChat, 
    deleteChat, 
    selectChat,
    t,
    renameChat,
    togglePinChat,
    loadDemoCase
  } = useChats();
  
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  // Renaming State
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
      setIsHelpOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Explorer-style auto-select text on rename focus
  useEffect(() => {
    if (renamingChatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingChatId]);

  const handleSaveRename = (chatId: string) => {
    if (renameValue.trim()) {
      renameChat(chatId, renameValue.trim());
    }
    setRenamingChatId(null);
  };

  const handleCancelRename = () => {
    setRenamingChatId(null);
  };

  const filteredChats = chats.filter((chat) => {
    const qLower = searchQuery.toLowerCase().trim();
    if (!qLower) return true;

    // 1. Direct matching
    const titleVal = chat.title.toLowerCase();
    const placeholderVal = chat.title === 'New Case Inquiry' ? t('New Case Inquiry').toLowerCase() : '';
    if (titleVal.includes(qLower) || placeholderVal.includes(qLower)) return true;

    // 2. Transliterated matching
    const queryTrans = transliterateToEnglish(qLower);
    const titleTrans = transliterateToEnglish(chat.title);
    if (titleTrans.includes(queryTrans)) return true;

    // 3. Vowel-stripped matching
    const queryVowelStripped = stripVowels(queryTrans);
    const titleVowelStripped = stripVowels(titleTrans);
    if (queryVowelStripped && titleVowelStripped.includes(queryVowelStripped)) return true;

    // 4. Message content matching
    const messagesMatch = chat.messages.some((m) => {
      const mContentLower = m.content.toLowerCase();
      if (mContentLower.includes(qLower)) return true;
      
      const mContentTrans = transliterateToEnglish(mContentLower);
      if (mContentTrans.includes(queryTrans)) return true;

      const mContentVowelStripped = stripVowels(mContentTrans);
      if (queryVowelStripped && mContentVowelStripped.includes(queryVowelStripped)) return true;
      
      return false;
    });

    return messagesMatch;
  });

  const handleNewCase = () => {
    createChat(t('new_case'));
    setIsOpenOnMobile(false); // Close drawer on mobile
  };

  const handleSelectChat = (id: string) => {
    // Prevent selecting if we are currently renaming
    if (renamingChatId) return;
    selectChat(id);
    setIsOpenOnMobile(false); // Close drawer on mobile
  };

  // Split chats into Pinned vs Normal
  const pinnedChats = filteredChats.filter(chat => chat.pinned);
  const normalChats = filteredChats.filter(chat => !chat.pinned);

  // Sort normal chats by activity/creation date descending
  const recentChats = [...normalChats].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const renderChatLink = (chat: typeof chats[0]) => {
    const isActive = chat.id === activeChatId;
    const isRenaming = chat.id === renamingChatId;

    return (
      <div
        key={chat.id}
        className={cn(
          "group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none border",
          isActive 
            ? "bg-white border-indigo-100 dark:bg-zinc-900 dark:border-indigo-950/80 shadow-sm text-purple-600 dark:text-purple-400" 
            : "text-muted-foreground hover:bg-white dark:hover:bg-zinc-800/40 hover:text-foreground hover:shadow-sm border-transparent"
        )}
        onClick={() => handleSelectChat(chat.id)}
      >
        <div className="flex items-center gap-2.5 overflow-hidden w-full pr-6">
          <MessageSquare className={cn(
            "size-4 shrink-0", 
            isActive ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground group-hover:text-foreground"
          )} />
          
          {isCollapsed ? null : (
            isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveRename(chat.id);
                  } else if (e.key === 'Escape') {
                    handleCancelRename();
                  }
                }}
                onBlur={() => handleSaveRename(chat.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-950 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
            ) : (
              <span className="truncate pr-1 text-left font-semibold tracking-wide flex items-center gap-1 w-full text-slate-900 dark:text-slate-100">
                {chat.title === 'New Case Inquiry' ? t('New Case Inquiry') : chat.title}
                {chat.pinned && <Pin className="size-3 text-amber-500 shrink-0 inline ml-0.5 rotate-45" />}
              </span>
            )
          )}
        </div>
        
        {/* Three-Dots Menu Button */}
        {!isCollapsed && !isRenaming && (
          <div className="absolute right-2 flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === chat.id ? null : chat.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              title="Options"
            >
              <MoreVertical className="size-3.5" />
            </button>
            
            {/* Dropdown Menu */}
            {openMenuId === chat.id && (
              <div 
                className="absolute right-0 top-6 w-36 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingChatId(chat.id);
                    setRenameValue(chat.title);
                    setOpenMenuId(null);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <Edit3 className="size-3" />
                  <span>{t('rename_case')}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinChat(chat.id);
                    setOpenMenuId(null);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  {chat.pinned ? (
                    <>
                      <PinOff className="size-3" />
                      <span>{t('unpin_case')}</span>
                    </>
                  ) : (
                    <>
                      <Pin className="size-3" />
                      <span>{t('pin_case')}</span>
                    </>
                  )}
                </button>
                <div className="border-t border-border/60 my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                    setOpenMenuId(null);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-3" />
                  <span>{t('delete_case')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F8F7FA] dark:bg-[#0D0F16] text-card-foreground border-r border-indigo-100/60 dark:border-indigo-950/60">
      
      {/* Brand Header — compact ChatGPT-style single row */}
      <div className={cn(
        "flex items-center px-3 py-3 border-b border-border/60",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {/* Left side: Logo + Brand Name */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex items-center justify-center p-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-orange-500 text-white shadow-md shrink-0">
            <Scale className="size-4" />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-amber-500 to-amber-400 bg-clip-text text-transparent truncate">
              {t('brand_title')}
            </span>
          )}
        </div>

        {/* Right side: Collapse/Expand Toggle — desktop only, next to logo/title on the far right */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 shrink-0"
            title={t('collapse_sidebar')}
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}

        {/* If collapsed, show PanelLeft icon button only */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 shrink-0"
            title={t('expand')}
          >
            <PanelLeft className="size-4" />
          </button>
        )}

        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsOpenOnMobile(false)}
          className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Action Button: New Case */}
      <div className="p-3">
        <button
          onClick={handleNewCase}
          className={cn(
            "flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/15 active:scale-[0.98] transition-all duration-200",
            isCollapsed ? "aspect-square p-2" : ""
          )}
          title={t('new_case')}
        >
          <Plus className="size-4 shrink-0" />
          {!isCollapsed && <span>{t('new_case')}</span>}
        </button>
      </div>

      {/* Search Conversations */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
             <input
              type="text"
              placeholder={t('search_chats')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-900/60 border border-indigo-100/80 dark:border-indigo-950/80 rounded-lg text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-left caret-purple-500 dark:caret-purple-500 transition-all duration-200"
            />
          </div>
        </div>
      )}



      {/* Case Conversations History */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 custom-scrollbar">
        
        {/* Pinned Cases Group */}
        {pinnedChats.length > 0 && (
          <div className="space-y-1 pb-3 border-b border-border/40">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>📌</span>
                <span>{t('pinned_cases')}</span>
              </h3>
            )}
            {pinnedChats.map(renderChatLink)}
          </div>
        )}

        {/* Recent Cases Group */}
        {recentChats.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>🕘</span>
                <span>{t('recent_cases') || "Recent"}</span>
              </h3>
            )}
            {recentChats.map(renderChatLink)}
          </div>
        )}

        {filteredChats.length === 0 && (
          <div className="py-8 text-center px-4">
            <MessageSquare className="size-6 text-muted-foreground/40 mx-auto mb-2" />
            {!isCollapsed && (
              <p className="text-xs text-muted-foreground">{t('no_chats_found')}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-border/60 bg-muted/20 dark:bg-muted/10 space-y-1.5">
        
        {/* Help Menu & Theme Selector beside it */}
        {!isCollapsed && (
          <div className="relative flex items-center justify-between w-full">
            <button
              onClick={(e) => { e.stopPropagation(); setIsHelpOpen(!isHelpOpen); }}
              className="flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              <HelpCircle className="size-4 shrink-0" />
              <span>{t('help_menu')}</span>
            </button>

            {/* Theme Toggle beside Help */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 shrink-0"
              title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
            >
              {theme === 'dark' ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-indigo-500" />
              )}
            </button>

            {isHelpOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-full bg-popover border border-border rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => {
                    setIsHelpOpen(false);
                    localStorage.removeItem('nyaya-tour-completed');
                    window.dispatchEvent(new CustomEvent('nyaya-relaunch-tour'));
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  {t('relaunch_tour')}
                </button>
                <button
                  onClick={() => {
                    setIsHelpOpen(false);
                    loadDemoCase('landlord');
                    setIsOpenOnMobile(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Gavel className="size-3.5" />
                  {t('load_judge_demo')}
                </button>
                <div className="border-t border-border/60 my-1" />
                <button
                  onClick={() => {
                    setIsHelpOpen(false);
                    setIsAboutOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Info className="size-3.5" />
                  {t('help_about')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Collapsed: show icon-only theme toggle */}
        {isCollapsed && (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 w-full flex justify-center"
            title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
          >
            {theme === 'dark' ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-indigo-500" />}
          </button>
        )}

      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block shrink-0 transition-all duration-300 h-full",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      {isOpenOnMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsOpenOnMobile(false)}
          />
          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full h-full animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-white/20 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close button top right */}
            <button 
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              title="Close"
            >
              <X className="size-4" />
            </button>

            {/* Logo and Name */}
            <div className="flex flex-col items-center text-center mt-2 mb-4">
              <div className="flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg mb-3">
                <Scale className="size-8" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">LexiGuard</h2>
              <span className="text-xs font-semibold text-muted-foreground mt-0.5">Version 1.0</span>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-wider">
                AI-Powered Multi-Agent Legal Intelligence Platform
              </p>
            </div>

            {/* Description */}
            <p className="text-xs leading-relaxed text-muted-foreground text-center mb-5 px-2">
              LexiGuard helps citizens understand legal disputes, organize evidence, assess case strength, simplify legal documents, and generate legal notices using an intelligent multi-agent AI architecture.
            </p>

            {/* Features list */}
            <div className="bg-muted/40 dark:bg-muted/10 border border-border/60 rounded-xl p-4 mb-5">
              <span className="text-[10px] font-bold text-foreground/75 uppercase tracking-wider block mb-2">Key Features</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  "Legal Advice",
                  "Document Simplifier",
                  "Evidence Verification",
                  "Case Strength Analysis",
                  "Timeline Generator",
                  "Legal Document Generation",
                  "Multilingual Support",
                  "Voice Input"
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border/60 pt-4 flex items-center justify-between text-xs">
              <div className="text-muted-foreground">
                Developed by <span className="font-bold text-foreground">Sejal Patel</span>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
