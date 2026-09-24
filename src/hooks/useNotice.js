import { useState } from 'react'

export function useNotice() {
  const [notice, setNotice] = useState({ type: '', text: '' })

  return {
    notice,
    notifySuccess: (text) => setNotice({ type: 'success', text }),
    notifyError: (text) => setNotice({ type: 'error', text: text ?? 'Ocurrió un error.' }),
    clear: () => setNotice({ type: '', text: '' }),
  }
}
