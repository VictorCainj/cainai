"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import AceEditor from "react-ace";
import { Code2, Save, RotateCcw, X } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-ruby";
import "ace-builds/src-noconflict/mode-php";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/theme-tomorrow_night";

// Types
export type CodeLanguage =
  | "css"
  | "javascript"
  | "typescript"
  | "html"
  | "json"
  | "python"
  | "java"
  | "c_cpp"
  | "ruby"
  | "php"
  | "sql"
  | "markdown"
  | "golang"
  | "rust"
  | "lua";

interface LanguageOption {
  value: CodeLanguage;
  label: string;
  extension: string;
}

interface CodeEditorProps {
  className?: string;
  language?: CodeLanguage;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

// Constants
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "css", label: "CSS", extension: ".css" },
  { value: "javascript", label: "JavaScript", extension: ".js" },
  { value: "typescript", label: "TypeScript", extension: ".ts" },
  { value: "html", label: "HTML", extension: ".html" },
  { value: "json", label: "JSON", extension: ".json" },
  { value: "python", label: "Python", extension: ".py" },
  { value: "java", label: "Java", extension: ".java" },
  { value: "c_cpp", label: "C/C++", extension: ".cpp" },
  { value: "ruby", label: "Ruby", extension: ".rb" },
  { value: "php", label: "PHP", extension: ".php" },
  { value: "sql", label: "SQL", extension: ".sql" },
  { value: "markdown", label: "Markdown", extension: ".md" },
  { value: "golang", label: "Go", extension: ".go" },
  { value: "rust", label: "Rust", extension: ".rs" },
  { value: "lua", label: "Lua", extension: ".lua" },
];

const PLACEHOLDERS: Record<CodeLanguage, string> = {
  css: `/* Hello World in CSS */
.hello-world {
  color: blue;
  font-size: 16px;
}`,
  javascript: `// Hello World in JavaScript
// console.log("Hello, World!");`,
  typescript: `// Hello World in TypeScript
const message: string = "Hello, World!";
// console.log(message);`,
  html: `<!-- Hello World in HTML -->
<h1>Hello, World!</h1>`,
  json: `{
  "message": "Hello, World!"
}`,
  python: `# Hello World in Python
print("Hello, World!")`,
  java: `// Hello World in Java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  c_cpp: `// Hello World in C/C++
#include <iostream>
using namespace std;
int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  ruby: `# Hello World in Ruby
puts "Hello, World!"`,
  php: `<?php
// Hello World in PHP
echo "Hello, World!";
?>`,
  sql: `-- Hello World in SQL
SELECT 'Hello, World!' AS message;`,
  markdown: `# Hello, World!
Welcome to Markdown.`,
  golang: `// Hello World in Go
package main
import "fmt"
func main() {
    fmt.Println("Hello, World!")
}`,
  rust: `// Hello World in Rust
fn main() {
    println!("Hello, World!");
}`,
  lua: `-- Hello World in Lua
print("Hello, World!")`,
};

// Utility Functions
const useAceTheme = () => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return "tomorrow";
  const currentTheme = theme === "system" ? systemTheme : theme;
  return currentTheme === "dark" ? "tomorrow_night" : "tomorrow";
};

// Components
function CodeEditorSheet({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="code-editor-sheet" {...props} />;
}

function CodeEditorSheetTrigger({
  className,
  children = (
    <Button variant="outline" className="gap-2">
      <Code2 className="h-4 w-4" />
      Open Code Editor
    </Button>
  ),
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return (
    <SheetPrimitive.Trigger
      data-slot="code-editor-sheet-trigger"
      className={cn(className)}
      asChild
      {...props}
    >
      {children}
    </SheetPrimitive.Trigger>
  );
}

function CodeEditorSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="code-editor-sheet-overlay"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[99999] bg-black"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', opacity: 1 }}
      />
      <SheetPrimitive.Content
        data-slot="code-editor-sheet-content"
        className={cn(
          "bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:scale-in-95 data-[state=open]:scale-in-100 fixed z-[100000] flex flex-col shadow-2xl transition-all duration-300 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border",
          "w-[95vw] max-w-[900px] h-[90vh] max-h-[700px]",
          className
        )}
        style={{ backgroundColor: '#ffffff', opacity: 1 }}
        {...props}
      >
        <div style={{ backgroundColor: '#ffffff', minHeight: '100%', opacity: 1 }}>
          {children}
        </div>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function CodeEditorSheetHeader({
  className,
  title = "Code Editor",
  description = "Write and edit your custom code",
  language,
  ...props
}: React.ComponentProps<"div"> & {
  title?: string;
  description?: string;
  language?: CodeLanguage;
}) {
  const selectedLanguage = LANGUAGE_OPTIONS.find(
    (opt) => opt.value === language
  );
  return (
    <div
      data-slot="code-editor-sheet-header"
      className={cn("px-6 py-4 border-b bg-white", className)}
      style={{ backgroundColor: '#ffffff' }}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <SheetPrimitive.Title
            data-slot="code-editor-sheet-title"
            className="flex items-center gap-2 text-foreground font-semibold"
          >
            <Code2 className="h-5 w-5" />
            {title}
          </SheetPrimitive.Title>
          <SheetPrimitive.Description
            data-slot="code-editor-sheet-description"
            className="mt-1 text-muted-foreground text-sm"
          >
            {description}
          </SheetPrimitive.Description>
        </div>
        <div className="flex items-center gap-2">
          {selectedLanguage && (
            <Badge variant="secondary">
              {selectedLanguage.extension}
            </Badge>
          )}
          <SheetPrimitive.Close asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </SheetPrimitive.Close>
        </div>
      </div>
    </div>
  );
}

function CodeEditorSheetControls({
  className,
  language,
  allowLanguageChange = false,
  onLanguageChange,
  onReset,
  onSave,
  ...props
}: React.ComponentProps<"div"> & {
  language: CodeLanguage;
  allowLanguageChange?: boolean;
  onLanguageChange?: (value: CodeLanguage) => void;
  onReset?: () => void;
  onSave?: () => void;
}) {
  return (
    <div
      data-slot="code-editor-sheet-controls"
      className={cn("px-6 py-3 border-b bg-white", className)}
      style={{ backgroundColor: '#ffffff' }}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {allowLanguageChange && onLanguageChange ? (
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="border border-input bg-muted rounded-md px-2 py-1 uppercase">
              {language}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-3"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave} size="sm" className="h-8 px-3">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeEditor({
  className,
  language = "css",
  value = "",
  onChange,
  placeholder,
  ...props
}: CodeEditorProps) {
  return (
    <div
      data-slot="code-editor"
      className={cn("flex-1 relative bg-white", className)}
      style={{ backgroundColor: '#ffffff', opacity: 1 }}
      {...props}
    >
      <AceEditor
        mode={language}
        theme="tomorrow"
        value={value}
        onChange={onChange}
        name="code-editor"
        width="100%"
        height="100%"
        fontSize={14}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={true}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 2,
          useWorker: false,
          wrap: true,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
        }}
        placeholder={placeholder || PLACEHOLDERS[language]}
        style={{
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          backgroundColor: '#ffffff',
        }}
        editorProps={{
          $blockScrolling: true,
        }}
        onLoad={(editor) => {
          if (editor && editor.container) {
            editor.container.style.backgroundColor = '#ffffff';
            editor.container.style.opacity = '1';
            const aceEditor = editor.container.querySelector('.ace_editor') as HTMLElement;
            if (aceEditor) {
              aceEditor.style.backgroundColor = '#ffffff';
              aceEditor.style.opacity = '1';
            }
            const aceContent = editor.container.querySelector('.ace_content') as HTMLElement;
            if (aceContent) {
              aceContent.style.backgroundColor = '#ffffff';
            }
          }
        }}
      />
    </div>
  );
}

interface CodeEditorSheetComposedProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  defaultLanguage?: CodeLanguage;
  allowLanguageChange?: boolean;
  defaultValue?: string;
  onSave?: (code: string, language: CodeLanguage) => void;
  onReset?: () => void;
  placeholder?: string;
}

function CodeEditorSheetComposed({
  trigger,
  title,
  description,
  defaultLanguage = "css",
  allowLanguageChange = false,
  defaultValue = "",
  onSave,
  onReset,
  placeholder,
}: CodeEditorSheetComposedProps) {
  const [language, setLanguage] = React.useState<CodeLanguage>(defaultLanguage);
  const [code, setCode] = React.useState<string>(defaultValue);

  // Update code when defaultValue changes
  React.useEffect(() => {
    setCode(defaultValue);
  }, [defaultValue]);

  // Update language when defaultLanguage changes
  React.useEffect(() => {
    setLanguage(defaultLanguage);
  }, [defaultLanguage]);

  const handleSave = () => {
    onSave?.(code, language);
  };

  const handleReset = () => {
    setCode(defaultValue);
    onReset?.();
  };

  return (
    <CodeEditorSheet>
      <CodeEditorSheetTrigger>{trigger}</CodeEditorSheetTrigger>
      <CodeEditorSheetContent>
        <CodeEditorSheetHeader
          title={title}
          description={description}
          language={language}
        />
        <CodeEditorSheetControls
          language={language}
          allowLanguageChange={allowLanguageChange}
          onLanguageChange={setLanguage}
          onReset={handleReset}
          onSave={handleSave}
        />
        <CodeEditor
          language={language}
          value={code}
          onChange={setCode}
          placeholder={placeholder}
        />
      </CodeEditorSheetContent>
    </CodeEditorSheet>
  );
}

export {
  CodeEditorSheet,
  CodeEditorSheetTrigger,
  CodeEditorSheetContent,
  CodeEditorSheetHeader,
  CodeEditorSheetControls,
  CodeEditor,
  CodeEditorSheetComposed,
}; 