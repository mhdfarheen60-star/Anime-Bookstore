import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GSI_SRC = 'https://accounts.google.com/gsi/client'

// Load the Google Identity Services script once per page, however many
// buttons mount.
let gsiPromise
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve()
  gsiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = () => {
      gsiPromise = undefined
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.appendChild(script)
  })
  return gsiPromise
}

// Renders Google's own "Sign in with Google" button. Google hands back a
// signed ID token (the credential), which the backend verifies.
// Renders nothing when VITE_GOOGLE_CLIENT_ID is not configured.
function GoogleSignInButton({ onCredential, onError, text = 'continue_with', disabled = false }) {
  const containerRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const errorRef = useRef(onError)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    callbackRef.current = onCredential
    errorRef.current = onError
  })

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            // Google reports failures (e.g. origin_mismatch) through this
            // callback too; surface them instead of silently dropping them.
            if (response?.error) {
              errorRef.current?.(new Error(response.error_description || response.error))
              return
            }
            callbackRef.current?.(response.credential)
          },
          ux_mode: 'popup',
        })
        const width = Math.min(containerRef.current.offsetWidth || 320, 400)
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          logo_alignment: 'center',
          width,
        })
      })
      .catch((error) => {
        if (cancelled) return
        setFailed(true)
        errorRef.current?.(error)
      })

    return () => {
      cancelled = true
    }
  }, [text])

  if (!CLIENT_ID || failed) return null

  // Keep the iframe in light mode to match the surrounding white card.
  return (
    <div
      ref={containerRef}
      aria-busy={disabled}
      style={{ colorScheme: 'light' }}
      className={`flex h-11 w-full justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    />
  )
}

export default GoogleSignInButton
