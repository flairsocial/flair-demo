// Utility functions for SMS handling

// Rate limiting to prevent SMS spam
const smsRateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkSMSRateLimit(recipientPhone: string): boolean {
  const now = Date.now()
  const key = recipientPhone
  const limit = smsRateLimit.get(key)
  
  // Allow 3 SMS per hour per phone number
  const maxMessages = 3
  const timeWindow = 60 * 60 * 1000 // 1 hour in milliseconds
  
  if (!limit || now > limit.resetTime) {
    // Reset or initialize rate limit
    smsRateLimit.set(key, { count: 1, resetTime: now + timeWindow })
    return true
  }
  
  if (limit.count >= maxMessages) {
    console.log('[SMS] Rate limit exceeded for phone:', recipientPhone)
    return false
  }
  
  // Increment count
  limit.count += 1
  return true
}

export function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle US phone numbers
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  } else if (digits.startsWith('+')) {
    return phone // Already formatted
  }
  
  // For international numbers, assume they're correctly formatted
  if (digits.length > 7) {
    return `+${digits}`
  }
  
  return null
}