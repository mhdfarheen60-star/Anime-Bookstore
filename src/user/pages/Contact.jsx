import { useState } from 'react'
import { api } from '../../api/client'

// The contact form sits on the dark storefront, so its fields use the dark
// surface treatment and a readable placeholder colour.
const inputClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-moon outline-none transition placeholder:text-mist focus:border-electric focus:bg-panel aria-[invalid=true]:border-red-400'
const labelClass = 'mb-2 block text-sm font-medium text-mist'
const errorClass = 'mt-1.5 text-sm text-red-600'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validate = ({ name, email, message }) => {
  const errors = {}
  if (name.trim().length < 2) errors.name = 'Please enter your name (at least 2 characters).'
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Please enter a valid email address.'
  if (message.trim().length < 10) errors.message = 'Please write a message of at least 10 characters.'
  else if (message.trim().length > 5000) errors.message = 'Message cannot exceed 5000 characters.'
  return errors
}

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [formError, setFormError] = useState('')

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validation = validate(form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    setStatus('sending')
    setFormError('')
    try {
      const response = await api.sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      })
      if (response?.success) {
        setStatus('sent')
        setForm({ name: '', email: '', message: '' })
        setErrors({})
      } else {
        throw new Error(response?.message || 'Could not send your message. Please try again.')
      }
    } catch (err) {
      setStatus('error')
      setFormError(err?.message || 'Could not send your message. Please try again.')
    }
  }

  return (
    <section className="mx-auto max-w-xl px-6 py-14">
      <h1 className="text-center text-3xl font-bold text-moon">Contact Us</h1>
      <p className="mt-3 text-center text-sm text-mist">
        Send us a message and we will get back to you as soon as we can.
      </p>

      {status === 'sent' && (
        <p role="status" className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-3 text-center text-emerald-800">
          Thanks! Your message has been received. We will get back to you soon.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor="contact-name" className={labelClass}>Your name</label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            className={inputClass}
            value={form.name}
            onChange={setField('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
          />
          {errors.name && <p id="contact-name-error" role="alert" className={errorClass}>{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>Email address</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            className={inputClass}
            value={form.email}
            onChange={setField('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
          />
          {errors.email && <p id="contact-email-error" role="alert" className={errorClass}>{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="contact-message" className={labelClass}>Message</label>
          <textarea
            id="contact-message"
            name="message"
            rows="5"
            placeholder="Message"
            className={`${inputClass} resize-none`}
            value={form.message}
            onChange={setField('message')}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'contact-message-error' : undefined}
          />
          {errors.message && <p id="contact-message-error" role="alert" className={errorClass}>{errors.message}</p>}
        </div>

        {status === 'error' && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-center text-red-700">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full rounded-md bg-sakura py-3 font-semibold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </section>
  )
}

export default Contact
