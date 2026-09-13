export const NEW_PASSWORD_MIN = 12
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function newPasswordError(password: string, confirmation: string) {
  if (password.length < NEW_PASSWORD_MIN || password.length > 128) return 'Use between 12 and 128 characters. A long, unique passphrase or a password-manager suggestion works well.'
  if (password !== confirmation) return 'The two passwords do not match.'
  return null
}
export function safeAuthNext(value: string | null) { return ['/account', '/studio', '/auth/reset-password'].includes(value ?? '') ? value! : '/account' }
export const accountExistsMessage = 'This email is already used for a KAPORAL account. Sign in or use Forgot password to recover it. Use another email only if you want a separate account.'
export function friendlyAuthError(error: { message?: string; status?: number; code?: string }) {
  const message = String(error?.message ?? '').toLowerCase()
  if (error?.status === 429 || message.includes('rate limit') || message.includes('too many')) return { message: 'Too many requests. Wait a few minutes before trying again.', rateLimited: true }
  if (error?.code === 'invalid_credentials' || message.includes('invalid login credentials')) return { message: 'The email or password is incorrect. Use Forgot password if you need to recover your account.', rateLimited: false }
  if (message.includes('email not confirmed')) return { message: 'Confirm your email address using the newest KAPORAL confirmation email before signing in.', rateLimited: false }
  if (['user_already_exists', 'email_exists'].includes(error?.code ?? '') || message.includes('already registered') || message.includes('already been registered')) return { message: accountExistsMessage, rateLimited: false }
  if (error?.code === 'same_password') return { message: 'Choose a new password different from your current password.', rateLimited: false }
  if (error?.code === 'weak_password') return { message: 'That password did not meet the security requirements. Choose a longer, unique password or use your password manager.', rateLimited: false }
  return { message: 'We could not complete that request. Please try again or contact support.', rateLimited: false }
}
