"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, Sparkles, Brain, Loader2 } from 'lucide-react';

interface ConversationLoadingProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export function ConversationLoading({ isVisible, onAnimationComplete }: ConversationLoadingProps) {
  const [currentText, setCurrentText] = useState(0);
  const [dots, setDots] = useState('');

  const loadingTexts = [
    'Carregando conversa...',
    'Preparando contexto...',
    'Organizando mensagens...',
    'Quase pronto...'
  ];

  // Animação de pontos
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Rotação de texto
  useEffect(() => {
    if (!isVisible) return;

    const textInterval = setInterval(() => {
      setCurrentText(prev => (prev + 1) % loadingTexts.length);
    }, 800);

    return () => clearInterval(textInterval);
  }, [isVisible, loadingTexts.length]);

  // Chamar callback quando animação completa
  useEffect(() => {
    if (!isVisible && onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300">
      <div className="relative">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-3xl blur-xl scale-150"></div>
        
        {/* Main loading card */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 min-w-[320px]">
          {/* Header icons */}
          <div className="flex justify-center space-x-3 mb-6">
            <div className="relative">
              <MessageSquare className="w-8 h-8 text-blue-500 animate-pulse" />
              <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-spin" />
            </div>
            <Brain className="w-8 h-8 text-purple-500 animate-bounce" />
          </div>

          {/* Loading spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Outer ring */}
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-600 rounded-full"></div>
              {/* Inner spinning ring */}
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              {/* Center icon */}
              <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600 animate-spin" />
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {loadingTexts[currentText]}{dots}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aguarde um momento
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center space-x-2 mt-6">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentText
                    ? 'bg-blue-500 scale-110'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 