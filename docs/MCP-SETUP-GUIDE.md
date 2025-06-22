# Guia de Instalação do MCP Desktop Commander no Cursor

## ✅ Status da Instalação
- [x] Desktop Commander instalado via NPX
- [x] Arquivos de configuração MCP atualizados
- [x] Pronto para usar no Cursor

## 📁 Arquivos de Configuração Disponíveis

Você agora tem os seguintes arquivos de configuração MCP:

1. **`mcp.json`** - Configuração básica (Desktop Commander + Context7)
2. **`mcp-complete.json`** - Configuração completa (Desktop Commander + Supabase + Context7)
3. **`cursor-mcp-config.json`** - Configuração específica para Cursor

## 🛠️ Como Configurar no Cursor

### Opção 1: Usando as Configurações do Cursor

1. Abra o Cursor
2. Vá em **File > Preferences > Settings** (ou `Ctrl+,`)
3. Procure por "MCP" nas configurações
4. Se houver uma opção para configurar servidores MCP, use o conteúdo de um dos arquivos JSON acima

### Opção 2: Arquivo de Configuração Manual

Se o Cursor usar um arquivo de configuração específico:

1. Localize o arquivo de configuração do Cursor (geralmente em `%APPDATA%\Cursor\` no Windows)
2. Copie o conteúdo do arquivo `cursor-mcp-config.json` para a configuração do Cursor
3. Reinicie o Cursor

### Opção 3: Via Extensão ou Plugin

Se você estiver usando uma extensão MCP no Cursor:

1. Instale a extensão MCP apropriada
2. Configure os servidores usando um dos arquivos JSON fornecidos
3. Reinicie o Cursor

## 🚀 Funcionalidades do Desktop Commander

Depois de configurado, o Desktop Commander oferece:

### 🖥️ Controle do Terminal
- Executar comandos do terminal
- Gerenciar processos
- Monitorar saídas de comandos longos

### 📁 Sistema de Arquivos
- Ler e escrever arquivos
- Pesquisar arquivos e código
- Navegar por diretórios
- Gerenciar metadados de arquivos

### ✏️ Edição de Código
- Substituições de texto precisas
- Edições cirúrgicas em arquivos
- Suporte a múltiplos arquivos
- Busca e substituição baseada em padrões

### 🔧 Configuração
- Configurar shells padrão
- Definir diretórios permitidos
- Bloquear comandos sensíveis
- Controlar limites de leitura/escrita

## 🔒 Configurações de Segurança

### Configurações Recomendadas:
```json
{
  "allowedDirectories": ["C:\\cdi", "C:\\Users\\yourusername\\projects"],
  "blockedCommands": ["rm -rf", "format", "del /s"],
  "defaultShell": "powershell",
  "fileWriteLineLimit": 50
}
```

### Como aplicar configurações:
```
// No chat com Claude/Cursor:
"Configure o Desktop Commander com diretórios permitidos apenas para C:\cdi"
```

## 🔄 Comandos de Teste

Para testar se está funcionando, tente estes comandos no chat:

```
"Liste os arquivos no diretório atual"
"Mostre o conteúdo do arquivo package.json"
"Execute o comando: npm --version"
"Crie um arquivo de teste chamado hello.txt"
```

## 🛠️ Solução de Problemas

### Se não estiver funcionando:

1. **Verifique se o Node.js está instalado**:
   ```
   node --version
   npm --version
   ```

2. **Reinstale o Desktop Commander**:
   ```
   npx @wonderwhy-er/desktop-commander@latest setup
   ```

3. **Verifique os logs do Cursor** para mensagens de erro relacionadas ao MCP

4. **Reinicie o Cursor** completamente

### Problemas Comuns:

- **Terminal não abre**: Problema com permissões do PowerShell
- **Comandos não executam**: Verificar configuração de shell padrão
- **Arquivos não são lidos**: Verificar diretórios permitidos

## 📞 Suporte

- **Discord**: https://discord.com/invite/kQ27sNnZr7
- **GitHub**: https://github.com/wonderwhy-er/DesktopCommanderMCP
- **Site Oficial**: https://desktopcommander.app/

## ⚡ Próximos Passos

1. Reinicie o Cursor
2. Teste os comandos básicos
3. Configure as permissões de segurança
4. Explore as funcionalidades avançadas

**Boa sorte com o seu novo assistente AI potencializado! 🎉** 