import { config } from 'dotenv'
import { Redis } from '@upstash/redis'

// Load environment variables
config({ path: '.env.local' })

async function testRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  console.log('URL:', url)
  console.log('Token set:', !!token)

  if (!url || !token) {
    console.error('Redis environment variables not set')
    return
  }

  try {
    const redis = new Redis({
      url,
      token,
    })

    console.log('Testing ping...')
    const result = await redis.ping()
    console.log('Ping result:', result)

    console.log('Testing set...')
    await redis.setex('test', 10, 'hello')
    console.log('Set successful')

    console.log('Testing get...')
    const value = await redis.get('test')
    console.log('Get result:', value)

  } catch (error) {
    console.error('Redis test failed:', error)
  }
}

testRedis()