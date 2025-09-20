/**
 * Test script to verify marketplace API functionality
 * Run with: node test-marketplace-apis.js
 */

const https = require('https')
const http = require('http')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Test configuration
const TEST_QUERY = 'airforce 1s'
const TEST_CONFIGS = {
  poshmark: {
    key: process.env.POSHMARK_RAPIDAPI_KEY,
    host: process.env.POSHMARK_RAPIDAPI_HOST,
    endpoint: 'https://poshmark.p.rapidapi.com/search',
    params: { query: TEST_QUERY, limit: 5 }
  },
  aliexpress: {
    key: process.env.ALIEXPRESS_RAPIDAPI_KEY,
    host: process.env.ALIEXPRESS_RAPIDAPI_HOST,
    endpoint: 'https://aliexpress-api2.p.rapidapi.com/search',
    params: { query: TEST_QUERY, limit: 5 }
  },
  stockx: {
    key: process.env.STOCKX_RAPIDAPI_KEY,
    host: process.env.STOCKX_RAPIDAPI_HOST,
    endpoint: 'https://stockx-api.p.rapidapi.com/search',
    params: { query: TEST_QUERY, limit: 5 }
  }
}

function makeRequest(url, headers, params = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url)
    Object.entries(params).forEach(([key, value]) => {
      fullUrl.searchParams.append(key, value)
    })

    console.log(`Making request to: ${fullUrl.toString()}`)
    console.log(`Headers:`, Object.keys(headers))

    const protocol = fullUrl.protocol === 'https:' ? https : http

    const req = protocol.request(fullUrl, {
      method: 'GET',
      headers: headers,
      timeout: 10000
    }, (res) => {
      let data = ''

      console.log(`Response status: ${res.statusCode}`)
      console.log(`Response headers:`, res.headers)

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            status: res.statusCode,
            data: parsed,
            rawData: data.substring(0, 500) + (data.length > 500 ? '...' : '')
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            rawData: data.substring(0, 500) + (data.length > 500 ? '...' : ''),
            parseError: e.message
          })
        }
      })
    })

    req.on('error', (error) => {
      console.error(`Request error:`, error.message)
      reject(error)
    })

    req.on('timeout', () => {
      console.log('Request timed out')
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

async function testAPI(provider, config) {
  console.log(`\n=== Testing ${provider.toUpperCase()} ===`)

  if (!config.key || !config.host) {
    console.log(`❌ Missing credentials for ${provider}`)
    console.log(`Key present: ${!!config.key}`)
    console.log(`Host present: ${!!config.host}`)
    return
  }

  console.log(`✅ Credentials found for ${provider}`)
  console.log(`Key: ${config.key.substring(0, 10)}...`)
  console.log(`Host: ${config.host}`)

  try {
    const headers = {
      'X-RapidAPI-Key': config.key,
      'X-RapidAPI-Host': config.host,
      'Content-Type': 'application/json'
    }

    const response = await makeRequest(config.endpoint, headers, config.params)

    console.log(`Status: ${response.status}`)

    if (response.parseError) {
      console.log(`❌ JSON Parse Error: ${response.parseError}`)
      console.log(`Raw response: ${response.rawData}`)
      return
    }

    if (Array.isArray(response.data)) {
      console.log(`✅ Array response with ${response.data.length} items`)
      if (response.data.length > 0) {
        console.log(`First item:`, JSON.stringify(response.data[0], null, 2))
      } else {
        console.log(`❌ Empty array - API returned no results`)
      }
    } else if (response.data && typeof response.data === 'object') {
      console.log(`📦 Object response:`, Object.keys(response.data))
      console.log(`Response data:`, JSON.stringify(response.data, null, 2))
    } else {
      console.log(`❓ Unexpected response type:`, typeof response.data)
      console.log(`Raw response: ${response.rawData}`)
    }

  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 Starting Marketplace API Tests')
  console.log(`Test query: "${TEST_QUERY}"`)
  console.log('=' .repeat(50))

  for (const [provider, config] of Object.entries(TEST_CONFIGS)) {
    await testAPI(provider, config)
  }

  console.log('\n' + '=' .repeat(50))
  console.log('🏁 Tests completed')
}

// Run the tests
main().catch(console.error)
