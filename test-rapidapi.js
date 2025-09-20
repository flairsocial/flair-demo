/**
 * Enhanced test script to debug RapidAPI marketplace integrations
 * Run with: node test-rapidapi.js
 *
 * This script provides detailed debugging information to pinpoint API failures
 */

const https = require('https')
const http = require('http')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Test configurations for each marketplace
const MARKETPLACES = [
  {
    name: 'Facebook Marketplace',
    host: process.env.FACEBOOK_MARKETPLACE_RAPIDAPI_HOST,
    key: process.env.FACEBOOK_MARKETPLACE_RAPIDAPI_KEY,
    endpoint: 'search',
    params: 'query=iphone&sort=newest&city=toronto&daysSinceListed=1&limit=5'
  },
  {
    name: 'Grailed',
    host: process.env.GRAILED_RAPIDAPI_HOST,
    key: process.env.GRAILED_RAPIDAPI_KEY,
    endpoint: 'search',
    params: 'query=jordan&hitsPerPage=5&sortBy=mostrecent'
  },
  {
    name: 'Etsy',
    host: process.env.ETSY_RAPIDAPI_HOST,
    key: process.env.ETSY_RAPIDAPI_KEY,
    endpoint: 'details',
    params: 'url=https%3A%2F%2Fwww.etsy.com%2Flisting%2F1338700035%2Fset-of-4-christmas-felt-ornaments'
  },
  {
    name: 'Poshmark',
    host: process.env.POSHMARK_RAPIDAPI_HOST,
    key: process.env.POSHMARK_RAPIDAPI_KEY,
    endpoint: 'search',
    params: 'query=dress&limit=5'
  },
  {
    name: 'eBay',
    host: process.env.EBAY_RAPIDAPI_HOST,
    key: process.env.EBAY_RAPIDAPI_KEY,
    endpoint: 'products',
    params: 'product_name=laptop&country=us&limit=5'
  },
  {
    name: 'AliExpress',
    host: process.env.ALIEXPRESS_RAPIDAPI_HOST,
    key: process.env.ALIEXPRESS_RAPIDAPI_KEY,
    endpoint: 'search',
    params: 'query=phone&limit=5'
  },
  {
    name: 'StockX',
    host: process.env.STOCKX_RAPIDAPI_HOST,
    key: process.env.STOCKX_RAPIDAPI_KEY,
    endpoint: 'search',
    params: 'query=jordan&limit=5'
  }
]

function makeRequest(marketplace) {
  return new Promise((resolve, reject) => {
    if (!marketplace.key || !marketplace.host) {
      console.log(`   🔑 Missing credentials for ${marketplace.name}`)
      console.log(`      Key configured: ${!!marketplace.key}`)
      console.log(`      Host configured: ${!!marketplace.host}`)
      resolve({
        name: marketplace.name,
        status: 'MISSING_CREDENTIALS',
        error: 'API key or host not configured'
      })
      return
    }

    const url = `https://${marketplace.host}/${marketplace.endpoint}?${marketplace.params}`

    console.log(`   🌐 Request URL: ${url}`)
    console.log(`   🔑 API Key: ${marketplace.key.substring(0, 10)}...`)
    console.log(`   🏠 Host: ${marketplace.host}`)

    const options = {
      headers: {
        'X-RapidAPI-Key': marketplace.key,
        'X-RapidAPI-Host': marketplace.host,
        'Content-Type': 'application/json',
        'User-Agent': 'FlairSocial-Test/1.0'
      },
      timeout: 15000
    }

    console.log(`   📋 Headers:`, JSON.stringify(options.headers, null, 2))

    const req = https.request(url, options, (res) => {
      console.log(`   📡 Response Status: ${res.statusCode}`)
      console.log(`   📡 Response Headers:`, JSON.stringify(Object.fromEntries(Object.entries(res.headers).slice(0, 5)), null, 2))

      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        console.log(`   📊 Response Body Length: ${data.length} characters`)

        // Log first 500 characters of response for debugging
        if (data.length > 0) {
          console.log(`   📄 Response Preview: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}`)
        }

        try {
          const parsed = JSON.parse(data)
          console.log(`   ✅ JSON Parsed Successfully`)
          resolve({
            name: marketplace.name,
            status: res.statusCode,
            response: parsed,
            success: res.statusCode === 200,
            fullResponse: data,
            headers: res.headers
          })
        } catch (e) {
          console.log(`   ❌ JSON Parse Error: ${e.message}`)
          resolve({
            name: marketplace.name,
            status: res.statusCode,
            response: data,
            success: res.statusCode === 200,
            parseError: e.message,
            fullResponse: data,
            headers: res.headers
          })
        }
      })
    })

    req.on('error', (error) => {
      console.log(`   🚨 Network Error: ${error.message}`)
      console.log(`   🚨 Error Code: ${error.code}`)
      resolve({
        name: marketplace.name,
        status: 'ERROR',
        error: error.message,
        errorCode: error.code,
        success: false
      })
    })

    req.on('timeout', () => {
      console.log(`   ⏰ Request timed out after ${options.timeout}ms`)
      req.destroy()
      resolve({
        name: marketplace.name,
        status: 'TIMEOUT',
        error: 'Request timed out',
        success: false
      })
    })

    req.end()
  })
}

async function testFailingAPIs() {
  console.log('🎯 Focused Testing of Failing APIs (Etsy & eBay)\n')
  console.log('=' .repeat(60))

  const failingAPIs = MARKETPLACES.filter(m =>
    m.name.toLowerCase().includes('etsy') || m.name.toLowerCase().includes('ebay')
  )

  console.log(`Testing ${failingAPIs.length} problematic APIs with enhanced debugging...\n`)

  for (const marketplace of failingAPIs) {
    console.log(`🔍 DEEP TESTING: ${marketplace.name}`)
    console.log('─'.repeat(40))

    try {
      const result = await makeRequest(marketplace)

      if (result.success) {
        console.log(`✅ ${result.name}: UNEXPECTED SUCCESS (${result.status})`)
      } else {
        console.log(`❌ ${result.name}: FAILED (${result.status})`)

        // Detailed failure analysis
        if (result.status === 404) {
          console.log(`   🔍 404 Analysis:`)
          console.log(`      - Endpoint may not exist`)
          console.log(`      - API service may be discontinued`)
          console.log(`      - URL structure may have changed`)
        } else if (result.status === 401 || result.status === 403) {
          console.log(`   🔍 Auth Analysis:`)
          console.log(`      - API key may be invalid or expired`)
          console.log(`      - Insufficient permissions`)
          console.log(`      - Host header mismatch`)
        } else if (result.status >= 500) {
          console.log(`   🔍 Server Analysis:`)
          console.log(`      - RapidAPI service may be down`)
          console.log(`      - Backend API issues`)
        }

        if (result.error) {
          console.log(`   🚨 Error: ${result.error}`)
        }
        if (result.errorCode) {
          console.log(`   🚨 Error Code: ${result.errorCode}`)
        }
        if (result.parseError) {
          console.log(`   🚨 Parse Error: ${result.parseError}`)
        }

        // Show response details for debugging
        if (result.fullResponse) {
          console.log(`   📄 Full Response: ${result.fullResponse}`)
        }
        if (result.headers) {
          console.log(`   📋 Response Headers:`, result.headers)
        }
      }
    } catch (error) {
      console.log(`❌ ${marketplace.name}: CRITICAL EXCEPTION`)
      console.log(`   🚨 Exception: ${error.message}`)
      console.log(`   🚨 Stack: ${error.stack}`)
    }

    console.log('') // Empty line for readability
    await new Promise(resolve => setTimeout(resolve, 2000)) // Longer delay for failing APIs
  }

  console.log('=' .repeat(60))
  console.log('🎯 Focused testing complete. Check the detailed output above.')
}

async function testAllMarketplaces() {
  console.log('🧪 Testing RapidAPI Marketplace Integrations\n')
  console.log('=' .repeat(50))

  const results = []

  for (const marketplace of MARKETPLACES) {
    console.log(`\n🔍 Testing ${marketplace.name}...`)

    try {
      const result = await makeRequest(marketplace)
      results.push(result)

      if (result.success) {
        console.log(`✅ ${result.name}: SUCCESS (${result.status})`)

        // Show sample data if available
        if (result.response && Array.isArray(result.response) && result.response.length > 0) {
          console.log(`   📦 Found ${result.response.length} items`)
          console.log(`   📄 Sample item: ${result.response[0].title || 'N/A'}`)
        } else if (result.response && typeof result.response === 'object') {
          const keys = Object.keys(result.response)
          console.log(`   📋 Response keys: ${keys.join(', ')}`)
        }
      } else {
        console.log(`❌ ${result.name}: FAILED (${result.status})`)
        if (result.error) {
          console.log(`   🚨 Error: ${result.error}`)
        }
        if (result.parseError) {
          console.log(`   🚨 Parse Error: ${result.parseError}`)
        }

        // Additional debugging for 404 errors
        if (result.status === 404) {
          console.log(`   💡 Suggestion: Check if the API endpoint exists on RapidAPI`)
          console.log(`   💡 Suggestion: Verify the API service is still active`)
        }
      }
    } catch (error) {
      console.log(`❌ ${marketplace.name}: EXCEPTION`)
      console.log(`   🚨 Exception: ${error.message}`)
      results.push({
        name: marketplace.name,
        status: 'EXCEPTION',
        error: error.message,
        success: false
      })
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '=' .repeat(50))
  console.log('\n📊 SUMMARY:')

  const successful = results.filter(r => r.success).length
  const total = results.length

  console.log(`✅ Successful: ${successful}/${total}`)
  console.log(`❌ Failed: ${total - successful}/${total}`)

  if (successful === 0) {
    console.log('\n🚨 All APIs failed! Check your RapidAPI keys and network connection.')
  } else if (successful < total) {
    console.log('\n⚠️  Some APIs failed. Check the errors above.')
    console.log('\n🔍 Running focused test on failing APIs...')

    // Automatically run focused test on failing APIs
    await testFailingAPIs()
  } else {
    console.log('\n🎉 All APIs working correctly!')
  }

  // Show failed APIs
  const failed = results.filter(r => !r.success)
  if (failed.length > 0) {
    console.log('\n❌ Failed APIs:')
    failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.status} ${f.error || ''}`)
    })
  }
}

// Run the tests
testAllMarketplaces().catch(console.error)

// Run focused test on failing APIs only
 //testFailingAPIs().catch(console.error)
