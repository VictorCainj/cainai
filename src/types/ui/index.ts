import { ReactNode } from 'react'

// Base component props
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  id?: string
  testId?: string
}

// Button types
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

// Modal types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  showCloseButton?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationProps {
  id: string
  type: NotificationType
  title?: string
  message: string
  duration?: number
  onClose?: () => void
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

// Loading types
export interface LoadingProps {
  isLoading: boolean
  loadingText?: string
  size?: 'sm' | 'md' | 'lg'
}

// Common utility types
export type ComponentVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning'
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' 