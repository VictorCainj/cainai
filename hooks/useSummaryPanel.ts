import { useState, useCallback } from 'react'

interface SummaryPanelState {
  isOpen: boolean
  loading: boolean
  error: string | null
}

export const useSummaryPanel = () => {
  const [state, setState] = useState<SummaryPanelState>({
    isOpen: false,
    loading: false,
    error: null
  })

  const openPanel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true, error: null }))
  }, [])

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      isOpen: false,
      loading: false,
      error: null
    })
  }, [])

  return {
    ...state,
    openPanel,
    closePanel,
    setLoading,
    setError,
    resetState
  }
}