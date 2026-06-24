'use client';

import React, { useState } from 'react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { useChats } from '@/hooks/use-chats';
import { Scale, User, Copy, Check, RotateCcw } from 'lucide-react';

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
            : "bg-gradient-to-tr from-amber-500 to-amber-600 text-white"
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
            {content}
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
