export interface AudioFile {
  file: File
  id: string
  name: string
  size: number
  duration?: number
  type: string
}

export interface TranscriptionResult {
  id: string
  text: string
  summary: string
  confidence: number
  duration: number
  timestamp: Date
  language?: string
  segments?: TranscriptionSegment[]
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  confidence: number
}

export interface AudioUploadState {
  isUploading: boolean
  isTranscribing: boolean
  progress: number
  error: string | null
  result: TranscriptionResult | null
}

export interface AudioUploadConfig {
  maxSizeBytes: number
  maxDurationMinutes: number
  supportedFormats: string[]
  autoSummarize: boolean
  language?: string
}

export type AudioUploadStatus = 
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'completed'
  | 'error' 