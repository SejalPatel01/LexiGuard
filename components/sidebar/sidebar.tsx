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
  ChevronLeft, 
  ChevronRight, 
  X,
  MoreVertical,
  Pin,
  PinOff,
  Edit3,
  Languages,
  HelpCircle,
  RotateCcw,
  Gavel,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    language,
    setLanguage,
    t,
    renameChat,
    togglePinChat,
    loadDemoCase
  } = useChats();
  
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
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
    const titleMatch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const messagesMatch = chat.messages.some((m) => 
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return titleMatch || messagesMatch;
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

  // Group normal chats by date categories
  const getGroupedChats = () => {
    const today: typeof chats = [];
    const yesterday: typeof chats = [];
    const older: typeof chats = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    normalChats.forEach((chat) => {
      const chatDate = new Date(chat.createdAt);
      chatDate.setHours(0, 0, 0, 0);

      if (chatDate.getTime() === now.getTime()) {
        today.push(chat);
      } else if (chatDate.getTime() === yesterdayDate.getTime()) {
        yesterday.push(chat);
      } else {
        older.push(chat);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = getGroupedChats();

  const renderChatLink = (chat: typeof chats[0]) => {
    const isActive = chat.id === activeChatId;
    const isRenaming = chat.id === renamingChatId;

    return (
      <div
        key={chat.id}
        className={cn(
          "group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer select-none",
          isActive 
            ? "bg-primary/10 text-primary border-l-2 border-primary dark:bg-primary/20 dark:text-amber-400 dark:border-amber-500" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => handleSelectChat(chat.id)}
      >
        <div className="flex items-center gap-2.5 overflow-hidden w-full pr-6">
          <MessageSquare className={cn(
            "size-4 shrink-0", 
            isActive ? "text-primary dark:text-amber-400" : "text-muted-foreground group-hover:text-foreground"
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
                className="w-full bg-background border border-primary dark:border-amber-500 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            ) : (
              <span className="truncate pr-1 text-left font-medium tracking-wide flex items-center gap-1 w-full">
                {chat.title}
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
    <div className="flex flex-col h-full bg-card text-card-foreground border-r border-border/80">
      
      {/* Brand Header — compact ChatGPT-style single row */}
      <div className={cn(
        "flex items-center px-3 py-3 border-b border-border/60",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Collapse toggle — desktop only, next to logo */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 shrink-0"
            title={isCollapsed ? t('expand') : t('collapse_sidebar')}
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>

          <div className="flex items-center justify-center p-1.5 rounded-lg bg-gradient-to-tr from-amber-600 to-indigo-600 text-white shadow-md shrink-0">
            <Scale className="size-4" />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-amber-500 to-indigo-500 bg-clip-text text-transparent truncate">
              {t('brand_title')}
            </span>
          )}
        </div>

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
            "flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/10 hover:shadow-amber-600/20 active:scale-[0.98] transition-all duration-200",
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
              className="w-full pl-9 pr-3 py-1.5 bg-muted/60 dark:bg-muted/30 border border-border/80 rounded-lg text-xs outline-none focus:border-primary dark:focus:border-amber-500 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
            />
          </div>
        </div>
      )}



      {/* Case Conversations History */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 custom-scrollbar">
        
        {/* Pinned Cases Group */}
        {!isCollapsed && pinnedChats.length > 0 && (
          <div className="space-y-1 pb-3 border-b border-border/40">
            <h3 className="px-3 text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Pin className="size-3" />
              {t('pinned_cases')}
            </h3>
            {pinnedChats.map(renderChatLink)}
          </div>
        )}

        {/* Today Group */}
        {today.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                {t('today')}
              </h3>
            )}
            {today.map(renderChatLink)}
          </div>
        )}

        {/* Yesterday Group */}
        {yesterday.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                {t('yesterday')}
              </h3>
            )}
            {yesterday.map(renderChatLink)}
          </div>
        )}

        {/* Older Group */}
        {older.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest mb-1.5">
                {t('older')}
              </h3>
            )}
            {older.map(renderChatLink)}
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
        
        {/* Language + Theme on one compact row */}
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex flex-1 items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-xs">
              <Languages className="size-3.5 text-muted-foreground shrink-0" />
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
                className="flex-1 bg-transparent border-none outline-none text-foreground font-semibold cursor-pointer text-xs min-w-0"
              >
                <option value="en" className="bg-popover text-foreground">EN</option>
                <option value="hi" className="bg-popover text-foreground">हिन्दी</option>
                <option value="gu" className="bg-popover text-foreground">ગુજ</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5 text-amber-400" />
              ) : (
                <Moon className="size-3.5 text-indigo-500" />
              )}
            </button>
          </div>
        )}

        {/* Collapsed: show icon-only language + theme */}
        {isCollapsed && (
          <>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 w-full flex justify-center"
              title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
            >
              {theme === 'dark' ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-indigo-500" />}
            </button>
          </>
        )}

        {/* Help Menu */}
        {!isCollapsed && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsHelpOpen(!isHelpOpen); }}
              className="flex items-center gap-3 w-full py-2 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              <HelpCircle className="size-4 shrink-0" />
              <span>{t('help_menu')}</span>
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
                  onClick={() => setIsHelpOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Info className="size-3.5" />
                  {t('help_about')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Card */}
        <div className={cn(
          "flex items-center gap-2.5 pt-1.5",
          isCollapsed ? "justify-center" : ""
        )}>
          <div className="size-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            JD
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-foreground leading-tight truncate">John Doe, Esq.</span>
              <span className="text-[10px] text-muted-foreground truncate">{t('counsel_account')}</span>
            </div>
          )}
        </div>
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
    </>
  );
}
