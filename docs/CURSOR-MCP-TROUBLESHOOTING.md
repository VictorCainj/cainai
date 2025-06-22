# 🔧 Guia de Solução de Problemas - MCP no Cursor

## ❓ **Problema: Desktop Commander não aparece na lista MCP**

Se você não vê o `desktop-commander` na lista de servidores MCP do Cursor, isso pode acontecer por algumas razões específicas do Cursor.

## ✅ **Soluções Passo a Passo:**

### **🎯 Método 1: Configuração Manual via Interface**

1. **Abra as configurações CORRETAS do Cursor:**
   - Pressione: `Ctrl + Shift + J` (Windows) ou `Cmd + Shift + J` (Mac)
   - ⚠️ **NÃO** use `Ctrl + ,` (configurações do VS Code)

2. **Navegue até MCP:**
   - Vá em: `Features` → `MCP Servers`
   - Clique em: `+ New MCP Server`

3. **Adicione o Desktop Commander:**
   ```
   Name: desktop-commander
   Command: npx
   Args: 
     - -y
     - @wonderwhy-er/desktop-commander
   ```

### **🎯 Método 2: Arquivo de Configuração (Projeto)**

O arquivo `.cursor/mcp.json` foi criado no seu projeto com a configuração correta.

### **🎯 Método 3: Arquivo de Configuração (Global)**

Para usar em todos os projetos, copie o arquivo `cursor-global-mcp.json` para:
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`
- **Mac/Linux**: `~/.cursor/mcp.json`

## 🔍 **Por que o Desktop Commander pode não aparecer:**

### **Compatibilidade**
- O Cursor tem sua própria implementação MCP
- Nem todos os servidores MCP são 100% compatíveis
- Desktop Commander foi feito primariamente para Claude Desktop

### **Problemas Conhecidos**
- Alguns servidores MCP abrem terminais externos no Windows
- O Cursor pode não reconhecer certos tipos de servidor
- Pode haver conflitos com outras configurações

## 🛠️ **Debugging e Verificação:**

### **Verificar se o NPX funciona:**
```powershell
npx @wonderwhy-er/desktop-commander --help
```

### **Testar o servidor diretamente:**
```powershell
npx -y @wonderwhy-er/desktop-commander
```

### **Verificar logs do Cursor:**
1. Vá em: `Help` → `Toggle Developer Tools`
2. Procure por erros relacionados a MCP na Console

## 🔄 **Passos de Reinicialização:**

1. **Salve todas as configurações**
2. **Feche o Cursor completamente**
3. **Reinicie o Cursor**
4. **Verifique novamente a lista MCP**

## 🚨 **Se ainda não funcionar:**

### **Alternativas:**
1. **Use Claude Desktop**: O Desktop Commander funciona perfeitamente lá
2. **Outros servidores MCP**: Teste com servidores conhecidamente compatíveis
3. **Versão do Cursor**: Certifique-se que tem uma versão recente (0.46+)

### **Comandos de teste sem MCP:**
Você ainda pode usar minhas ferramentas via:
- Terminal integrado do Cursor
- Extensões do VS Code/Cursor
- Scripts personalizados

## 📞 **Suporte Adicional:**

### **Cursor Forum**:
- https://forum.cursor.com/
- Procure por "MCP" para problemas similares

### **Desktop Commander**:
- Discord: https://discord.com/invite/kQ27sNnZr7
- GitHub: https://github.com/wonderwhy-er/DesktopCommanderMCP

## 🎯 **Resumo das Configurações Criadas:**

1. ✅ **`.cursor/mcp.json`** - Configuração para este projeto
2. ✅ **`cursor-global-mcp.json`** - Template para configuração global
3. ✅ **Backup das configurações antigas**

## ⚡ **Próximos Passos:**

1. Tente o Método 1 (interface manual)
2. Se não funcionar, reinicie o Cursor
3. Verifique se a versão do Cursor está atualizada
4. Como último recurso, use Claude Desktop para MCP

**Lembre-se: O MCP no Cursor ainda está em desenvolvimento ativo!** 