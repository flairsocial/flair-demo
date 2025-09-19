"use server"

// SMS notification service using Twilio
// Note: This requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables

import { formatPhoneNumber } from './sms-utils'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

interface SMSNotificationOptions {
  recipientPhone: string
  senderName: string
  messageType: 'new_message' | 'reply'
  isFirstMessage?: boolean
}

export async function sendSMSNotification(options: SMSNotificationOptions): Promise<boolean> {
  // Skip SMS in development or if Twilio credentials are not configured
  if (process.env.NODE_ENV === 'development' || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('[SMS] Skipping SMS notification in development or missing Twilio config')
    return true
  }

  try {
    const { recipientPhone, senderName, messageType, isFirstMessage } = options

    // Format phone number (ensure it starts with +1 for US numbers)
    const formattedPhone = formatPhoneNumber(recipientPhone)
    if (!formattedPhone) {
      console.error('[SMS] Invalid phone number format:', recipientPhone)
      return false
    }

    // Create appropriate message based on type
    let messageBody = ''
    if (messageType === 'new_message') {
      if (isFirstMessage) {
        messageBody = `${senderName} sent you a message on Flair! Open the app to reply: https://flair.social/inbox`
      } else {
        messageBody = `${senderName} replied to your conversation on Flair! Open the app: https://flair.social/inbox`
      }
    } else {
      messageBody = `${senderName} replied to you on Flair! Check your messages: https://flair.social/inbox`
    }

    // Use Twilio REST API directly (without SDK to avoid dependencies)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: messageBody,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[SMS] Twilio API error:', response.status, errorData)
      return false
    }

    const result = await response.json()
    console.log('[SMS] Message sent successfully:', result.sid)
    return true

  } catch (error) {
    console.error('[SMS] Error sending SMS notification:', error)
    return false
  }
}

// Check if SMS notifications should be sent for this user
export async function shouldSendSMSNotification(clerkId: string): Promise<boolean> {
  // In a real implementation, you'd check user preferences from the database
  // For now, assume all users want SMS notifications unless they've opted out
  
  try {
    // You could add a user_preferences table to track SMS opt-ins/opt-outs
    // For now, return true to enable SMS for all users
    return true
  } catch (error) {
    console.error('[SMS] Error checking SMS preferences:', error)
    return false
  }
}

// Get user's phone number from Clerk
export async function getUserPhoneNumber(clerkId: string): Promise<string | null> {
  try {
    // In production, you'd use Clerk's server SDK to get the user's phone number
    // For now, we'll assume the phone number is stored in the user's profile
    // or available through Clerk's user object
    
    // This is a placeholder - in real implementation you'd:
    // 1. Use Clerk's server SDK to fetch user data
    // 2. Extract the phone number from the user object
    // 3. Return the formatted phone number
    
    console.log('[SMS] Phone number lookup not implemented for user:', clerkId)
    return null
  } catch (error) {
    console.error('[SMS] Error getting user phone number:', error)
    return null
  }
}