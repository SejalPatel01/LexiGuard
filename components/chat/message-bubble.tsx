'use client';

import React, { useState } from 'react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { useChats } from '@/hooks/use-chats';
import { Scale, User, Copy, Check, RotateCcw, Shield, ShieldAlert } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  onRegenerate: () => void;
}

export function MessageBubble({ message, isLast, onRegenerate }: MessageBubbleProps) {
  const { t } = useChats();
  const { role, content, timestamp } = message;
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (message.isBlocked) {
    return (
      <div className="flex w-full gap-4 py-6 px-4 md:px-6 bg-red-500/5 dark:bg-red-500/10 border-b border-red-500/10 animate-in fade-in duration-300">
        <div className="flex w-full max-w-4xl gap-4">
          
          {/* Avatar (Red Shield Icon) */}
          <div className="size-8 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-tr from-red-500 to-rose-600 text-white shadow-md shadow-red-500/10 select-none">
            <Shield className="size-4" />
          </div>

          {/* Security Card Content */}
          <div className="flex-1 space-y-4 max-w-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-red-500/20 rounded-2xl p-5 shadow-lg shadow-red-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-red-500" />
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">🛡 LexiGuard Security Shield</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{timestamp}</span>
            </div>

            <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 pt-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Threat Detected</span>
                <span className="font-bold text-red-500">{message.threatType || 'Unknown Suspicious Input'}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Severity</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                  message.severity === 'CRITICAL' 
                    ? "bg-red-500/20 text-red-500 border border-red-500/30" 
                    : message.severity === 'HIGH' 
                      ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                      : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                )}>
                  {message.severity || 'HIGH'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Status</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Blocked Successfully
                </span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold block">Reason</span>
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {message.threatType === 'Prompt Injection' 
                    ? "Your message attempted to manipulate the internal AI instructions."
                    : "Your message attempted to bypass the platform rules using an unauthorized assistant persona."}
                </p>
                <p className="text-[10px] italic leading-relaxed text-muted-foreground pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                  For security reasons, LexiGuard ignored the malicious instructions and continued protecting the legal assistance system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full gap-4 py-6 px-4 md:px-6 transition-all duration-300 border-b border-border/40",
        isUser 
          ? "bg-transparent justify-end" 
          : "bg-muted/30 dark:bg-muted/10"
      )}
    >
      <div className={cn(
        "flex w-full max-w-4xl gap-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        
        {/* Avatar */}
        <div className={cn(
          "size-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm select-none",
          isUser 
            ? "bg-indigo-600 text-white" 
            : "bg-gradient-to-tr from-purple-600 to-orange-500 text-white"
        )}>
          {isUser ? (
            <User className="size-4" />
          ) : (
            <Scale className="size-4" />
          )}
        </div>

        {/* Message Panel */}
        <div className="flex flex-col flex-1 space-y-1.5 overflow-hidden">
          
          {/* Header */}
          <div className={cn(
            "flex items-center gap-2",
            isUser ? "justify-end" : "justify-start"
          )}>
            <span className="text-xs font-bold text-foreground">
              {isUser ? t('sender_you') : t('sender_ai')}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {timestamp}
            </span>
          </div>

          {/* Body Content */}
          <div className={cn(
            "text-sm leading-relaxed text-foreground whitespace-pre-wrap",
            isUser ? "text-right" : "text-left"
          )}>
            {t(content)}
          </div>

          {/* Action Footer (Only for Assistant messages) */}
          {!isUser && (
            <div className="flex items-center gap-3 pt-2">
              
              {/* Copy Action */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                title={t('copy_response')}
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">{t('copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>{t('copy_btn')}</span>
                  </>
                )}
              </button>

              {/* Regenerate Action (Only for last message) */}
              {isLast && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                  title={t('regenerate_response')}
                >
                  <RotateCcw className="size-3" />
                  <span>{t('regenerate')}</span>
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
