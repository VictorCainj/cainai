"use client";

import * as React from "react";
import { Code2, Copy, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InlineCodePanelProps {
  title?: string;
  language?: string;
  code?: string;
}

export function InlineCodePanel({
  title = "Visualizar Código",
  language = "text",
  code = "",
}: InlineCodePanelProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const downloadCode = () => {
    const fileExtensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      css: 'css',
      html: 'html',
      json: 'json',
      markdown: 'md',
      sql: 'sql',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      lua: 'lua',
    };

    const extension = fileExtensions[language.toLowerCase()] || 'txt';
    const fileName = `codigo.${extension}`;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  return (
    <div className="my-6 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 rounded">
            <Code2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-600">{code.split('\n').length} linhas • Pronto para uso</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
            {language.toUpperCase()}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCode}
            className="h-7 px-2 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Baixar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="h-7 px-2 text-xs"
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 mr-1" />
            )}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
          <Code2 className="h-3 w-3 mr-1" />
          Código ({language})
        </h4>
        <div className="bg-gray-900 rounded p-3 overflow-x-auto max-h-96">
          <pre className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
} 