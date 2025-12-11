import React from 'react';
import { AgentConfig } from '../types';
import * as Lucide from 'lucide-react';

interface AgentCardProps {
  config: AgentConfig;
  isActive: boolean;
  isProcessing: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ config, isActive, isProcessing }) => {
  // Dynamically get icon
  const IconComponent = (Lucide as any)[config.iconName] || Lucide.Bot;

  return (
    <div 
      className={`
        relative p-4 rounded-xl border transition-all duration-500 flex flex-col items-center justify-center gap-2
        ${isActive 
          ? `bg-white border-${config.color.replace('bg-', '')} shadow-lg scale-105 ring-2 ring-offset-2 ring-${config.color.replace('bg-', '')}` 
          : 'bg-slate-50 border-slate-200 opacity-70 scale-95'
        }
      `}
    >
      {/* Connector Line Animation (Simulated) */}
      {isActive && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-2 bg-blue-400 animate-pulse rounded-full" />
      )}

      <div className={`p-3 rounded-full text-white shadow-md ${config.color} ${isProcessing ? 'animate-bounce' : ''}`}>
        <IconComponent size={24} />
      </div>
      
      <div className="text-center">
        <h3 className={`text-sm font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
          {config.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
          {config.description}
        </p>
      </div>

      {isProcessing && (
         <div className="flex gap-1 mt-2">
           <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
           <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
           <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
         </div>
      )}
    </div>
  );
};

export default AgentCard;