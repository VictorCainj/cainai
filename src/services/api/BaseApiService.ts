import { ApiRequestConfig, ApiResponse, ApiError, HttpMethod } from '../../types/api'
import { getApiConfig } from '../../config/app'

export class BaseApiService {
  protected readonly baseUrl: string
  protected readonly timeout: number
  protected readonly retries: number

  constructor(baseUrl?: string) {
    const config = getApiConfig()
    this.baseUrl = baseUrl || config.baseUrl
    this.timeout = config.timeout
    this.retries = config.retries
  }

  protected async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { method, url, data, params, headers = {}, timeout = this.timeout } = config

    try {
      const fullUrl = this.buildUrl(url, params)
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      }

      const requestInit: RequestInit = {
        method,
        headers: requestHeaders,
        signal: AbortSignal.timeout(timeout),
      }

      if (data && method !== 'GET') {
        requestInit.body = JSON.stringify(data)
      }

      const response = await fetch(fullUrl, requestInit)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      return {
        success: true,
        data: responseData,
      }
    } catch (error) {
      return this.handleError(error as Error)
    }
  }

  protected async get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params })
  }

  protected async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data })
  }

  protected async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data })
  }

  protected async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, data })
  }

  protected async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url })
  }

  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`
    
    if (!params || Object.keys(params).length === 0) {
      return fullUrl
    }

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    return `${fullUrl}?${searchParams.toString()}`
  }

  private handleError(error: Error): ApiResponse {
    const apiError: ApiError = {
      code: 'API_ERROR',
      message: error.message,
      timestamp: new Date(),
    }

    // Handle specific error types
    if (error.name === 'AbortError') {
      apiError.code = 'TIMEOUT'
      apiError.message = 'Request timeout'
    } else if (error.message.includes('Failed to fetch')) {
      apiError.code = 'NETWORK_ERROR'
      apiError.message = 'Network error - check your connection'
    }

    return {
      success: false,
      error: apiError.message,
      code: apiError.code,
    }
  }

  // Retry mechanism
  protected async withRetry<T>(
    operation: () => Promise<ApiResponse<T>>,
    retries: number = this.retries
  ): Promise<ApiResponse<T>> {
    try {
      const result = await operation()
      if (result.success) {
        return result
      }
      
      if (retries > 0 && this.isRetryableError(result.code)) {
        await this.delay(1000 * (this.retries - retries + 1)) // Exponential backoff
        return this.withRetry(operation, retries - 1)
      }
      
      return result
    } catch (error) {
      if (retries > 0) {
        await this.delay(1000 * (this.retries - retries + 1))
        return this.withRetry(operation, retries - 1)
      }
      
      return this.handleError(error as Error)
    }
  }

  private isRetryableError(code?: string): boolean {
    const retryableCodes = ['TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR']
    return retryableCodes.includes(code || '')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 