import { ReactNode } from 'react'

// Base component props
export interface BaseComponentProps {
  readonly className?: string
  readonly children?: ReactNode
  readonly id?: string
  readonly testId?: string
}

// Button variants
export type ButtonVariant = 
  | 'default' 
  | 'destructive' 
  | 'outline' 
  | 'secondary' 
  | 'ghost' 
  | 'link'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends BaseComponentProps {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly disabled?: boolean
  readonly loading?: boolean
  readonly onClick?: () => void
  readonly type?: 'button' | 'submit' | 'reset'
}

// Input types
export interface InputProps extends BaseComponentProps {
  readonly type?: 'text' | 'email' | 'password' | 'search' | 'url'
  readonly placeholder?: string
  readonly value?: string
  readonly defaultValue?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly onChange?: (value: string) => void
  readonly onFocus?: () => void
  readonly onBlur?: () => void
  readonly error?: string
  readonly helperText?: string
}

// Modal types
export interface ModalProps extends BaseComponentProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly title?: string
  readonly description?: string
  readonly showCloseButton?: boolean
  readonly size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  readonly preventClose?: boolean
}

// Loading states
export interface LoadingProps {
  readonly isLoading: boolean
  readonly loadingText?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly variant?: 'spinner' | 'dots' | 'pulse'
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationProps {
  readonly id: string
  readonly type: NotificationType
  readonly title?: string
  readonly message: string
  readonly duration?: number
  readonly persistent?: boolean
  readonly onClose?: () => void
  readonly actions?: Array<{
    readonly label: string
    readonly onClick: () => void
    readonly variant?: ButtonVariant
  }>
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  readonly mode: ThemeMode
  readonly primaryColor: string
  readonly accentColor: string
  readonly borderRadius: string
  readonly fontSize: string
}

// Animation types
export interface AnimationConfig {
  readonly duration: number
  readonly easing: string
  readonly delay?: number
  readonly repeat?: boolean | number
}

// Layout types
export interface LayoutProps extends BaseComponentProps {
  readonly header?: ReactNode
  readonly sidebar?: ReactNode
  readonly footer?: ReactNode
  readonly fullHeight?: boolean
  readonly centered?: boolean
}

// Form types
export interface FormField {
  readonly name: string
  readonly label: string
  readonly type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio'
  readonly placeholder?: string
  readonly required?: boolean
  readonly disabled?: boolean
  readonly options?: Array<{ readonly value: string; readonly label: string }>
  readonly validation?: {
    readonly pattern?: RegExp
    readonly minLength?: number
    readonly maxLength?: number
    readonly min?: number
    readonly max?: number
    readonly custom?: (value: any) => string | null
  }
}

export interface FormProps extends BaseComponentProps {
  readonly fields: FormField[]
  readonly onSubmit: (data: Record<string, any>) => void | Promise<void>
  readonly initialValues?: Record<string, any>
  readonly loading?: boolean
  readonly disabled?: boolean
  readonly submitText?: string
  readonly resetText?: string
  readonly showReset?: boolean
}

// Navigation types
export interface NavItem {
  readonly id: string
  readonly label: string
  readonly href?: string
  readonly icon?: ReactNode
  readonly badge?: string | number
  readonly disabled?: boolean
  readonly children?: NavItem[]
}

export interface NavigationProps extends BaseComponentProps {
  readonly items: NavItem[]
  readonly activeItem?: string
  readonly onItemClick?: (item: NavItem) => void
  readonly collapsed?: boolean
  readonly showLabels?: boolean
}

// Table types
export interface TableColumn<T = any> {
  readonly key: string
  readonly title: string
  readonly width?: string | number
  readonly sortable?: boolean
  readonly filterable?: boolean
  readonly render?: (value: any, record: T) => ReactNode
}

export interface TableProps<T = any> extends BaseComponentProps {
  readonly columns: TableColumn<T>[]
  readonly data: T[]
  readonly loading?: boolean
  readonly pagination?: {
    readonly current: number
    readonly pageSize: number
    readonly total: number
    readonly onChange: (page: number, size: number) => void
  }
  readonly selection?: {
    readonly selectedKeys: string[]
    readonly onSelectionChange: (keys: string[]) => void
  }
  readonly sorting?: {
    readonly column: string
    readonly direction: 'asc' | 'desc'
    readonly onChange: (column: string, direction: 'asc' | 'desc') => void
  }
}

// Dropdown/Select types
export interface SelectOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
  readonly icon?: ReactNode
}

export interface SelectProps extends BaseComponentProps {
  readonly options: SelectOption[]
  readonly value?: string
  readonly defaultValue?: string
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly multiple?: boolean
  readonly searchable?: boolean
  readonly clearable?: boolean
  readonly loading?: boolean
  readonly error?: string
  readonly onChange: (value: string | string[]) => void
}

// Utility types for components
export type ComponentVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning'
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ComponentColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'

// Event handler types
export type ClickHandler = () => void
export type ChangeHandler<T = string> = (value: T) => void
export type SubmitHandler<T = any> = (data: T) => void | Promise<void> 