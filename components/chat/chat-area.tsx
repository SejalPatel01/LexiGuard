'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChats } from '@/hooks/use-chats';
import { MessageBubble } from './message-bubble';
import { SuggestedPrompts } from './suggested-prompts';
import { 
  Send, 
  Menu, 
  Sparkles, 
  Scale, 
  Paperclip, 
  Mic, 
  Briefcase,
  X,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatAreaProps {
  onToggleSidebarMobile: () => void;
  onToggleToolkitMobile: () => void;
  isToolkitOpenMobile: boolean;
  onGoHome?: () => void;
}

export function ChatArea({ 
  onToggleSidebarMobile, 
  onToggleToolkitMobile,
  isToolkitOpenMobile,
  onGoHome
}: ChatAreaProps) {
  const { 
    activeChat, 
    sendMessage, 
    isTyping, 
    regenerateLastMessage,
    uploadAndAnalyzeFile,
    t
  } = useChats();
  const [inputVal, setInputVal] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ name: string; type: string; base64: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showJumpButton, setShowJumpButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const shouldAutoScrollRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as Record<string, any>).SpeechRecognition || (window as Record<string, any>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('speech_unsupported') || "Speech recognition unsupported by your browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      
      // Auto select language from the active chat's chatLanguage
      const chatLang = activeChat?.chatLanguage || 'en';
      const langCode = chatLang === 'hi' ? 'hi-IN' : chatLang === 'gu' ? 'gu-IN' : 'en-IN';
      recognition.lang = langCode;

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: Record<string, any>) => {
        console.error("Speech recognition error:", event);
        if (event.error === 'not-allowed') {
          alert(t('mic_permission_denied') || "Microphone permission denied. Please allow mic access in browser settings.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: Record<string, any>) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInputVal((prev) => {
            const separator = prev.trim() === '' ? '' : ' ';
            return prev + separator + finalTranscript.trim();
          });
          
          // Auto resize textarea
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
            }
          }, 50);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_ignored) {}
      }
    };
  }, []);

  const processFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("Maximum upload size is 20 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const base64String = base64Data.split(',')[1];
      if (base64String) {
        setPendingAttachments((prev) => {
          if (prev.some((item) => item.name === file.name)) return prev;
          return [...prev, { name: file.name, type: file.type, base64: base64String }];
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

    Array.from(files).forEach((file) => {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex !== -1 ? file.name.substring(dotIndex).toLowerCase() : '';
      if (allowedExtensions.includes(ext) && (allowedMimes.includes(file.type) || (file.type === 'image/jpg' && ext === '.jpg'))) {
        processFile(file);
      } else {
        alert("This file type is not supported.");
      }
    });
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
      const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

      Array.from(files).forEach((file) => {
        const dotIndex = file.name.lastIndexOf('.');
        const ext = dotIndex !== -1 ? file.name.substring(dotIndex).toLowerCase() : '';
        if (allowedExtensions.includes(ext) && (allowedMimes.includes(file.type) || (file.type === 'image/jpg' && ext === '.jpg'))) {
          processFile(file);
        } else {
          alert("This file type is not supported.");
        }
      });
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Handle active chat ID change
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Snap instantly to bottom on chat switch
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    setShowJumpButton(false);
    setUnreadCount(0);
    shouldAutoScrollRef.current = true;
    prevMessagesLengthRef.current = activeChat?.messages.length || 0;
    
    // Autofocus chat input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeChat?.id, activeChat?.messages.length]);

  // Handle message changes & typing status to conditionally scroll
  useEffect(() => {
    if (!activeChat) return;
    const currentLen = activeChat.messages.length;
    const prevLen = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = currentLen;

    if (currentLen > prevLen) {
      const lastMsg = activeChat.messages[currentLen - 1];
      if (lastMsg.role === 'user') {
        // User sent a message: force auto-scroll to bottom
        shouldAutoScrollRef.current = true;
        setShowJumpButton(false);
        setUnreadCount(0);
        scrollToBottom();
      } else {
        // Assistant message arrived
        if (shouldAutoScrollRef.current) {
          scrollToBottom();
        } else {
          setUnreadCount((prev) => prev + 1);
          setShowJumpButton(true);
        }
      }
    } else if (isTyping) {
      if (shouldAutoScrollRef.current) {
        scrollToBottom();
      }
    }
  }, [activeChat, isTyping]);

  // Scroll event handler to detect user scrolling up/down
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      shouldAutoScrollRef.current = true;
      setShowJumpButton(false);
      setUnreadCount(0);
    } else {
      shouldAutoScrollRef.current = false;
      setShowJumpButton(true);
    }
  };

  const handleJumpToLatest = () => {
    shouldAutoScrollRef.current = true;
    setShowJumpButton(false);
    setUnreadCount(0);
    scrollToBottom();
  };

  // Handle auto-expanding text area
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleSend = async () => {
    const promptText = inputVal.trim();
    const attachments = [...pendingAttachments];

    if (!promptText && attachments.length === 0) return;
    if (isTyping) return;

    setInputVal('');
    setPendingAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Stop voice listening if active
    if (isListening) {
      stopListening();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadedDocsList: any[] = [];
    for (const file of attachments) {
      try {
        const docObj = await uploadAndAnalyzeFile(file.name, file.type, file.base64);
        if (docObj) {
          uploadedDocsList.push(docObj);
        }
      } catch (err) {
        console.error('Failed to upload and analyze file:', err);
      }
    }

    // Send text prompt if present, forwarding the analyzed document list to bypass stale React state issues
    if (promptText) {
      await sendMessage(promptText, uploadedDocsList.length > 0 ? uploadedDocsList : undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    // If voice listening is active, stop it
    if (isListening) stopListening();
    sendMessage(promptText);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-center relative">
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="absolute top-4 left-4 flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-bold px-3 py-1.5 rounded-full border border-purple-100/60 dark:border-purple-900/40 bg-purple-50/80 dark:bg-purple-950/30 backdrop-blur-sm shadow-sm hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Home className="size-3.5" />
            <span>Home</span>
          </button>
        )}
        <Scale className="size-12 text-purple-600 dark:text-purple-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">{t('no_case_selected')}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('select_case_desc')}
        </p>
      </div>
    );
  }

  const hasMessages = activeChat.messages.length > 0;

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-background overflow-hidden relative"
      onDragOver={handleDragOver}
    >
      
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card/60 backdrop-blur-md shrink-0">
        
        {/* Left Side: Mobile Menu Trigger & Case Title */}
        <div className="flex items-center gap-3 overflow-hidden">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-bold px-3 py-1.5 rounded-full border border-purple-100/60 dark:border-purple-900/40 bg-purple-50/80 dark:bg-purple-950/30 backdrop-blur-sm shadow-sm hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:scale-105 active:scale-95 transition-all duration-200 mr-2 shrink-0 animate-fade-in"
            >
              <Home className="size-3.5" />
              <span>Home</span>
            </button>
          )}
          
          <button
            onClick={onToggleSidebarMobile}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
            title={t('open_menu')}
          >
            <Menu className="size-5" />
          </button>
          
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate pr-2">
              {activeChat.title === 'New Case Inquiry' ? t('New Case Inquiry') : activeChat.title}
            </h1>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {hasMessages ? t('incident_analysis') : t('case_setup_intake')}
            </span>
          </div>
        </div>

        {/* Right Side: Toolkit Drawer toggle (Mobile/Tablet Only) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleToolkitMobile}
            className={cn(
              "xl:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200",
              isToolkitOpenMobile 
                ? "bg-primary/10 text-primary border-primary/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" 
                : "bg-muted text-muted-foreground border-border/80"
            )}
          >
            <Briefcase className="size-3.5" />
            <span>{t('toolkit_btn')}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative"
      >
        {!hasMessages ? (
          
          /* Welcome Screen State */
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 space-y-8 select-none">
            
            {/* Logo/Hero Branding */}
            <div className="flex flex-col items-center text-center max-w-xl space-y-3">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-orange-500 text-white shadow-xl shadow-purple-500/10 mb-2">
                <Scale className="size-7" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {t('evaluate_dispute') + ' '}
                <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">
                  {t('brand_title')}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('empty_onboarding')}
              </p>
            </div>
 
            {/* Suggested Prompts Grid */}
            <div className="flex flex-col items-center w-full space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-purple-600 dark:text-purple-400" />
                {t('select_sample')}
              </span>
              <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
            </div>
 
          </div>
        ) : (
          
          /* Chat Message Log State */
          <div className="flex flex-col w-full pb-10">
            {activeChat.messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={index === activeChat.messages.length - 1}
                onRegenerate={regenerateLastMessage}
              />
            ))}
 
            {/* Animated Typing Indicator */}
            {isTyping && (
              <div className="flex w-full gap-4 py-6 px-4 md:px-6 bg-muted/30 dark:bg-muted/10 border-b border-border/40">
                <div className="flex gap-4 flex-row w-full max-w-4xl">
                  <div className="size-8 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-tr from-purple-600 to-orange-500 text-white shadow-sm">
                    <Scale className="size-4" />
                  </div>
                  <div className="flex flex-col flex-1 space-y-1.5">
                    <span className="text-xs font-bold text-foreground">
                      {activeChat.messages[activeChat.messages.length - 1]?.content.startsWith('[Document Uploaded:')
                        ? t('ocr_running')
                        : t('reviewing_doc')}
                    </span>
                    
                    {/* Bouncing Dots Animation */}
                    <div className="flex items-center gap-1.5 py-2.5 px-3 bg-muted dark:bg-zinc-800 rounded-lg max-w-[80px] justify-center">
                      <div className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce typing-dot" />
                      <div className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce typing-dot [animation-delay:0.2s]" />
                      <div className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce typing-dot [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Dummy anchor for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Jump to Latest Floating Button */}
      {showJumpButton && (
        <button
          onClick={handleJumpToLatest}
          className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-zinc-900/95 text-primary dark:text-purple-400 border border-border/80 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-semibold backdrop-blur-md"
        >
          <span>
            {unreadCount > 0
              ? t('jump_latest_unread').replace('{count}', String(unreadCount))
              : t('jump_latest_simple')}
          </span>
        </button>
      )}

      {/* Input Box Footer bar */}
      <footer className="p-4 border-t border-border/80 bg-card/40 backdrop-blur-md shrink-0">
        
        {/* Active Listening Overlay Indicator */}
        {isListening && (
          <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-xs font-semibold animate-pulse">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>{t('listening') || "Listening..."}</span>
            </div>
            <button 
              onClick={stopListening}
              className="text-[10px] uppercase font-bold tracking-wider hover:underline"
            >
              {t('stop_btn')}
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto flex flex-col gap-2 bg-muted/50 dark:bg-muted/20 border border-border/80 rounded-xl p-2 focus-within:border-purple-500 dark:focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all duration-300">
          
          {/* Staged Attachments Preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 pt-2 border-b border-border/50 pb-2">
              {pendingAttachments.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <Paperclip className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => {
                      setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={t('remove_file')}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-end gap-2">
            {/* Active File Attachment Input & Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
              multiple
              className="hidden"
            />
            <button 
              data-tour-step="2"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title={t('upload_btn_title')}
            >
              <Paperclip className="size-4" />
            </button>

            {/* Chat Message Textarea */}
            <textarea
              data-tour-step="1"
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('chat_placeholder') || "Ask LexiGuard about your legal issue..."}
              className="flex-1 resize-none bg-transparent py-2.5 px-1 max-h-[160px] min-h-[36px] text-sm text-foreground outline-none border-none custom-scrollbar placeholder:text-muted-foreground/60"
            />

            {/* ChatGPT-style Voice Input Button */}
            <button 
              onClick={toggleListening}
              className={cn(
                "p-2 rounded-lg transition-all duration-200 cursor-pointer",
                isListening 
                  ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isListening ? t('mic_stop_hint') : t('click_speak')}
              type="button"
            >
              <Mic className="size-4" />
            </button>

            {/* Send Action Button */}
            <button
              onClick={handleSend}
              disabled={(!inputVal.trim() && pendingAttachments.length === 0) || isTyping}
              className={cn(
                "p-2 rounded-lg text-white shadow-md transition-all duration-200",
                (inputVal.trim() || pendingAttachments.length > 0) && !isTyping
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 cursor-pointer shadow-purple-500/10"
                  : "bg-muted-foreground/30 dark:bg-zinc-800 text-muted-foreground cursor-not-allowed shadow-none"
              )}
              title={t('send_message')}
            >
              <Send className="size-4 shrink-0" />
            </button>
          </div>
        </div>
        
        {/* Footer Helper Message */}
        <p className="text-[10px] text-muted-foreground text-center mt-2 font-medium tracking-wide">
          {t('disclaimer_footer')}
        </p>
      </footer>

      {/* Drag & Drop Glassmorphic Overlay */}
      {isDragging && (
        <div 
          className="absolute inset-0 bg-background/85 backdrop-blur-md border-4 border-dashed border-primary dark:border-purple-500 rounded-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-200"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3 text-center p-6 bg-card border border-border/80 rounded-2xl shadow-xl max-w-sm">
            <div className="size-16 rounded-full bg-primary/10 dark:bg-purple-500/10 flex items-center justify-center text-primary dark:text-purple-500">
              <Paperclip className="size-8" />
            </div>
            <h3 className="text-sm font-bold text-foreground">{t('drop_to_simplify')}</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              {t('drop_desc')}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
