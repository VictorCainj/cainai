// Formatador simples de texto - apenas negrito
export interface FormattingOptions {
  allowEmojis?: boolean
  allowMarkdown?: boolean
  allowHtml?: boolean
  maxLength?: number
  platform?: string
}

export interface FormattedTextElement {
  type: string
  content: string
  style?: React.CSSProperties
  className?: string
  metadata?: Record<string, any>
}

class AdvancedTextFormatter {
  public formatText(text: string, options: FormattingOptions = {}): FormattedTextElement[] {
    if (!options.allowMarkdown) {
      return [{ type: 'text', content: text }]
    }
    return this.parseBoldText(text)
  }

  private parseBoldText(text: string): FormattedTextElement[] {
    const elements: FormattedTextElement[] = []
    let currentIndex = 0

    while (currentIndex < text.length) {
      const boldStart = text.indexOf('**', currentIndex)
      
      if (boldStart === -1) {
        if (currentIndex < text.length) {
          elements.push({ type: 'text', content: text.slice(currentIndex) })
        }
        break
      }

      if (boldStart > currentIndex) {
        elements.push({ type: 'text', content: text.slice(currentIndex, boldStart) })
      }

      const boldEnd = text.indexOf('**', boldStart + 2)
      
      if (boldEnd === -1) {
        elements.push({ type: 'text', content: text.slice(boldStart) })
        break
      }

      const boldContent = text.slice(boldStart + 2, boldEnd)
      
      if (boldContent.trim()) {
        elements.push({ 
          type: 'bold', 
          content: boldContent, 
          className: 'markdown-bold' 
        })
      }

      currentIndex = boldEnd + 2
    }

    return elements
  }

  public getElementStyles(element: FormattedTextElement): React.CSSProperties {
    switch (element.type) {
      case 'bold':
        return { fontWeight: 'bold' }
      default:
        return {}
    }
  }
}

export const advancedTextFormatter = new AdvancedTextFormatter()
export default advancedTextFormatter
