import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { faEye, faEyeSlash, faBook, faArrowRight, faCheckCircle, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../context/useAuth'
import { homeForRole } from '../components/roleRoutes'
import GoogleSignInButton from '../components/GoogleSignInButton'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STRONG_RE = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

const inputBase =
  'w-full h-12 rounded-lg border bg-surface px-4 text-base text-moon outline-none transition placeholder:text-mist focus:bg-panel focus:ring-4 sm:text-sm disabled:opacity-60'
const inputOk = 'border-line focus:border-sakura focus:ring-sakura/15'
const inputBad = 'border-red-400 focus:border-red-500 focus:ring-red-500/10'

function validate(values, isLogin) {
  const errors = {}
  if (!isLogin) {
    if (values.name.trim().length < 2) errors.name = 'Please enter your full name'
    if (values.confirmPassword) {
      if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    } else {
      errors.confirmPassword = 'Please confirm your password'
    }
    if (values.username.trim()) {
      if (values.username.trim().length < 3) errors.username = 'Username must be at least 3 characters'
      else if (!/^[a-z0-9_]+$/.test(values.username.trim())) errors.username = 'Username can only contain lowercase letters, numbers, and underscores'
    }
  }
  if (!values.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address'

  if (!values.password) errors.password = 'Password is required'
  else if (!isLogin && (values.password.length < 8 || !STRONG_RE.test(values.password)))
    errors.password = 'Min 8 characters with uppercase, lowercase and a number'
  return errors
}

function Field({ label, name, error, disabled, children, ...props }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-mist">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${inputBase} ${error ? inputBad : inputOk} ${children ? 'pr-12' : ''}`}
          {...props}
        />
        {children}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function PasswordToggle({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute top-1/2 right-3 -translate-y-1/2 text-mist transition-colors hover:text-moon"
    >
      <FontAwesomeIcon icon={shown ? faEyeSlash : faEye} />
    </button>
  )
}

function Auth({ mode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, loginWithGoogle } = useAuth()
  const isLogin = mode === 'login'

  // Where a route guard wanted us to go before it bounced us here.
  const from = location.state?.from

  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '', username: '', bio: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [apiError, setApiError] = useState('')
  const timers = useRef([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate(values, isLogin)
    setErrors(found)
    if (Object.keys(found).length) return

    setStatus('submitting')
    setApiError('')

    try {
      let response;
      if (isLogin) {
        response = await login(values.email, values.password);
      } else {
        response = await register({
          name: values.name,
          email: values.email,
          password: values.password,
          username: values.username.trim() || undefined,
          bio: values.bio.trim() || undefined,
        });
      }

      if (response.success) {
        setStatus('success')
        // Signing in: honour the guarded destination. Signing up: the session
        // is already established, so send each role to its own landing page
        // too – bouncing through /login would just redirect again.
        const target = from || homeForRole(response.role)
        timers.current.push(setTimeout(() => navigate(target), 1200))
      } else {
        setStatus('error')
        setApiError(response.message || 'Authentication failed')
        if (response.errors) {
          const fieldErrors = {}
          response.errors.forEach(err => fieldErrors[err.field] = err.message)
          setErrors(fieldErrors)
        }
      }
    } catch (error) {
      setStatus('error')
      setApiError(error.message || 'Network error. Please try again.')
    }
  }

  // Google sign-in creates the account on first use, so on either screen it
  // ends signed in and goes straight to the destination.
  const handleGoogleCredential = async (credential) => {
    setStatus('submitting')
    setApiError('')
    try {
      const response = await loginWithGoogle(credential)
      if (response.success) {
        setStatus('success')
        const target = from || homeForRole(response.role)
        timers.current.push(setTimeout(() => navigate(target), 1200))
      } else {
        setStatus('error')
        setApiError(response.message || 'Google sign-in failed')
      }
    } catch (error) {
      setStatus('error')
      setApiError(error.message || 'Network error. Please try again.')
    }
  }

  const busy = status === 'submitting' || status === 'success'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface p-4">
      {/* Background: faint blue light over a white canvas, no imagery needed. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 15% 0%, rgba(59,130,246,0.10), transparent 55%),' +
            'radial-gradient(100% 80% at 85% 100%, rgba(59,130,246,0.06), transparent 50%),' +
            'linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)',
        }}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="surface-light animate-fade-in-up relative w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-xl shadow-black/5 sm:p-9">
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-electric/25 bg-electric/10">
            <FontAwesomeIcon icon={faBook} className="text-3xl text-electric" />
          </div>
        </div>

        <div className="mb-7 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-moon sm:text-5xl">BOOK STORE</h1>
          <p className="mt-1.5 text-base font-medium text-electric sm:text-lg">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {status === 'success' && (
          <div role="status" className="mb-5 flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-xl text-green-600" />
            <p className="text-sm text-green-800">{isLogin ? 'Signed in successfully' : 'Account created'}</p>
          </div>
        )}

        {status === 'error' && apiError && (
          <div role="alert" className="mb-5 flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-xl text-red-600" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!isLogin && (
            <Field label="Full Name" name="name" value={values.name} onChange={handleChange}
              error={errors.name} disabled={busy} placeholder="Enter your full name" autoComplete="name" />
          )}

          {!isLogin && (
            <Field label="Username (optional)" name="username" value={values.username} onChange={handleChange}
              error={errors.username} disabled={busy} placeholder="3-30 chars, lowercase letters, numbers, underscores" autoComplete="username" />
          )}

          <Field label="Email Address" name="email" type="email" value={values.email} onChange={handleChange}
            error={errors.email} disabled={busy} placeholder="you@example.com" autoComplete="email" />

          {!isLogin && (
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-mist">Bio (optional)</label>
              <textarea
                id="bio"
                name="bio"
                value={values.bio}
                onChange={handleChange}
                disabled={busy}
                placeholder="Tell us about yourself"
                rows={3}
                className="w-full rounded-lg border border-line bg-surface px-4 py-2 text-base text-moon outline-none transition placeholder:text-mist focus:border-sakura focus:bg-panel focus:ring-4 focus:ring-sakura/15 sm:text-sm disabled:opacity-60"
              />
              {errors.bio && (
                <p id="bio-error" className="mt-1 text-xs text-red-600">{errors.bio}</p>
              )}
            </div>
          )}

          <div>
            <Field label="Password" name="password" type={showPassword ? 'text' : 'password'}
              value={values.password} onChange={handleChange} error={errors.password} disabled={busy}
              placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}>
              <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
            </Field>
            {!isLogin && !errors.password && (
              <p className="mt-1 text-xs text-mist">Min 8 chars: uppercase, lowercase, number</p>
            )}
          </div>

          {!isLogin && (
            <Field label="Confirm Password" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
              value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
              disabled={busy} placeholder="Confirm your password" autoComplete="new-password">
              <PasswordToggle shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />
            </Field>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-sakura font-semibold text-white transition hover:bg-[#2563EB] hover:shadow-[0_8px_24px_rgba(59,130,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'submitting' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <FontAwesomeIcon icon={faArrowRight} />
              </>
            )}
          </button>

          {GOOGLE_ENABLED && (
            <>
              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-mist">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
              <GoogleSignInButton
                text={isLogin ? 'signin_with' : 'signup_with'}
                disabled={busy}
                onCredential={handleGoogleCredential}
                onError={(error) => {
                  setStatus('error');
                  setApiError(error?.message || 'Google sign-in failed. Please try again.');
                }}
              />
            </>
          )}

          <p className="text-center text-sm text-mist">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={isLogin ? '/signup' : '/login'}
              className="font-medium text-electric underline-offset-4 hover:text-[#1d4ed8] hover:underline"
            >
              {isLogin ? 'Register' : 'Login'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Auth