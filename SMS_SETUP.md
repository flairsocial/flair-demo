# SMS Notification Setup Guide

## Overview
The Flair app now supports SMS notifications to alert users when they receive new direct messages. This feature uses Twilio for reliable message delivery.

## Setup Instructions

### 1. Create a Twilio Account
1. Go to [twilio.com](https://www.twilio.com) and sign up for a free account
2. Verify your phone number during signup
3. Note your Account SID and Auth Token from the Twilio Console

### 2. Get a Twilio Phone Number
1. In the Twilio Console, go to Phone Numbers > Manage > Buy a number
2. Choose a phone number (free trial accounts get one free number)
3. Note the phone number in E.164 format (e.g., +1234567890)

### 3. Configure Environment Variables
Add these variables to your `.env.local` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Development vs Production

#### Development
- SMS notifications are automatically disabled in development mode
- Console logs will show when SMS would have been sent
- No actual messages are sent during development

#### Production
- SMS notifications are enabled when all environment variables are set
- Rate limiting prevents spam (max 3 SMS per hour per phone number)
- Failed SMS attempts are logged but don't break message functionality

## How It Works

### Notification Triggers
SMS notifications are sent when:
- Someone sends you a new direct message
- Someone replies to an existing conversation

### Rate Limiting
- Maximum 3 SMS per hour per phone number
- Prevents spam and reduces costs
- Rate limits reset automatically

### User Phone Numbers
Currently, the system needs to be configured to retrieve phone numbers from Clerk:
1. Users must provide phone numbers during signup or in profile settings
2. The SMS service needs to be connected to Clerk's user data
3. Users should be able to opt-out of SMS notifications in settings

## Cost Considerations

### Twilio Pricing (as of 2024)
- SMS to US/Canada: ~$0.0075 per message
- Free trial includes $15 in credits
- Each message is typically under 160 characters

### Cost Examples
- 100 messages/month: ~$0.75
- 1,000 messages/month: ~$7.50
- 10,000 messages/month: ~$75

## Next Steps

### For Full Implementation
1. **User Preferences**: Add SMS notification settings to user profiles
2. **Phone Number Collection**: Ensure users can add/verify phone numbers
3. **Opt-out Mechanism**: Allow users to disable SMS notifications
4. **International Support**: Handle international phone number formatting
5. **Delivery Status**: Track SMS delivery success/failure rates

### Optional Enhancements
- Rich messaging with MMS for image sharing
- Different notification types (mentions, replies, etc.)
- Time-based delivery preferences (e.g., no SMS after 10 PM)
- Bulk messaging for announcements

## Troubleshooting

### Common Issues
1. **SMS not sending**: Check environment variables and Twilio credentials
2. **Invalid phone number**: Ensure E.164 format (+1234567890)
3. **Rate limiting**: Check console logs for rate limit messages
4. **Cost concerns**: Monitor Twilio usage dashboard

### Testing
In development, check console logs for SMS simulation:
```
[SMS] Skipping SMS notification in development or missing Twilio config
```

### Support
- Twilio Documentation: https://www.twilio.com/docs
- Twilio Support: Available through console for paid accounts