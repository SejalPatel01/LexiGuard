'use client';

import React from 'react';
import { Coins, FileWarning, ShieldAlert, FileSignature } from 'lucide-react';
import { useChats } from '@/hooks/use-chats';

interface SuggestedPromptsProps {
  onSelectPrompt: (promptText: string) => void;
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const { t } = useChats();
  const prompts = [
    {
      text: t('prompt_landlord'),
      description: t('prompt_landlord_desc'),
      icon: Coins,
      colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40"
    },
    {
      text: t('prompt_notice'),
      description: t('prompt_notice_desc'),
      icon: FileWarning,
      colorClass: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40"
    },
    {
      text: t('prompt_scam'),
      description: t('prompt_scam_desc'),
      icon: ShieldAlert,
      colorClass: "text-rose-500 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40"
    },
    {
      text: t('prompt_contract'),
      description: t('prompt_contract_desc'),
      icon: FileSignature,
      colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full px-4">
      {prompts.map((p, idx) => {
        const Icon = p.icon;
        return (
          <div
            key={idx}
            onClick={() => onSelectPrompt(p.text)}
            className="group relative flex flex-col p-4 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 select-none"
          >
            {/* Top Row: Icon */}
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg border ${p.colorClass} transition-colors duration-300`}>
                <Icon className="size-4 shrink-0" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary dark:group-hover:text-amber-400 transition-colors duration-200">
                {p.text}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed pl-1">
              {p.description}
            </p>

            {/* Glowing Accent Corner Indicator */}
            <div className="absolute top-2 right-2 size-1.5 rounded-full bg-transparent group-hover:bg-primary/40 dark:group-hover:bg-amber-400/40 transition-all duration-300" />
          </div>
        );
      })}
    </div>
  );
}
