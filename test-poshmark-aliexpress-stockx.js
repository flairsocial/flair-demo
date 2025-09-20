/**
 * Test script to check if Poshmark, AliExpress, and StockX APIs return any results
 * Run with: node test-poshmark-aliexpress-stockx.js
 */

const https = require('https')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Test configurations for the three problematic APIs
const TEST_APIS = [
  {
    name: 'Poshmark',
    host: process.env.POSHMARK_RAPIDAPI_HOST,
    key: process.env.POSHMARK_RAPIDAPI_KEY,
    endpoint: 'search',
    params: 'query=dress&limit=5'
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

function makeRequest(api) {
  return new Promise((resolve, reject) => {
    if (!api.key || !api.host) {
      console.log(`❌ ${api.name}: Missing API credentials`)
      resolve({
        name: api.name,
        status: 'MISSING_CREDENTIALS',
        error: 'API key or host not configured',
        results: []
      })
      return
    }

    const url = `https://${api.host}/${api.endpoint}?${api.params}`

    console.log(`🔍 Testing ${api.name}...`)
    console.log(`   URL: ${url}`)

    const options = {
      headers: {
        'X-RapidAPI-Key': api.key,
        'X-RapidAPI-Host': api.host,
        'Content-Type': 'application/json',
        'User-Agent': 'FlairSocial-Test/1.0'
      },
      timeout: 10000
    }

    const req = https.request(url, options, (res) => {
      console.log(`   📡 Status: ${res.statusCode}`)

      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)

          if (res.statusCode === 200) {
            let results = []
            if (Array.isArray(parsed)) {
              results = parsed
            } else if (parsed.data && Array.isArray(parsed.data)) {
              results = parsed.data
            } else if (parsed.hits && Array.isArray(parsed.hits)) {
              results = parsed.hits
            } else if (parsed.results && Array.isArray(parsed.results)) {
              results = parsed.results
            } else if (typeof parsed === 'object') {
              // Check if it's a single object that might contain results
              const possibleArrays = Object.values(parsed).filter(val => Array.isArray(val))
              if (possibleArrays.length > 0) {
                results = possibleArrays[0]
              }
            }

            console.log(`   📦 Found ${results.length} results`)

            if (results.length > 0) {
              console.log(`   ✅ Sample result: ${results[0].title || results[0].name || 'No title field'}`)
            }

            resolve({
              name: api.name,
              status: res.statusCode,
              success: true,
              results: results,
              totalResults: results.length,
              sampleResult: results.length > 0 ? results[0] : null
            })
          } else {
            console.log(`   ❌ API returned status ${res.statusCode}`)
            console.log(`   📄 Response: ${data.substring(0, 200)}...`)
            resolve({
              name: api.name,
              status: res.statusCode,
              success: false,
              error: `HTTP ${res.statusCode}`,
              response: data,
              results: []
            })
          }
        } catch (e) {
          console.log(`   ❌ JSON Parse Error: ${e.message}`)
          console.log(`   📄 Raw Response: ${data.substring(0, 200)}...`)
          resolve({
            name: api.name,
            status: res.statusCode,
            success: false,
            error: `Parse error: ${e.message}`,
            rawResponse: data,
            results: []
          })
        }
      })
    })

    req.on('error', (error) => {
      console.log(`   🚨 Network Error: ${error.message}`)
      resolve({
        name: api.name,
        status: 'ERROR',
        success: false,
        error: error.message,
        results: []
      })
    })

    req.on('timeout', () => {
      console.log(`   ⏰ Request timed out`)
      req.destroy()
      resolve({
        name: api.name,
        status: 'TIMEOUT',
        success: false,
        error: 'Request timed out',
        results: []
      })
    })

    req.end()
  })
}

async function testAPIs() {
  console.log('🧪 Testing Poshmark, AliExpress, and StockX APIs\n')
  console.log('=' .repeat(60))

  const results = []

  for (const api of TEST_APIS) {
    try {
      const result = await makeRequest(api)
      results.push(result)

      if (result.success && result.totalResults > 0) {
        console.log(`✅ ${result.name}: SUCCESS - ${result.totalResults} results found`)
      } else if (result.success && result.totalResults === 0) {
        console.log(`⚠️  ${result.name}: SUCCESS but no results returned`)
      } else {
        console.log(`❌ ${result.name}: FAILED - ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.log(`❌ ${result.name}: CRITICAL EXCEPTION - ${error.message}`)
      results.push({
        name: api.name,
        status: 'EXCEPTION',
        success: false,
        error: error.message,
        results: []
      })
    }

    console.log('') // Empty line for readability
    await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limiting
  }

  console.log('=' .repeat(60))
  console.log('\n📊 SUMMARY:')

  const successful = results.filter(r => r.success).length
  const withResults = results.filter(r => r.success && r.totalResults > 0).length
  const total = results.length

  console.log(`✅ APIs responding: ${successful}/${total}`)
  console.log(`📦 APIs with results: ${withResults}/${total}`)

  if (withResults === 0) {
    console.log('\n🚨 None of these APIs are returning results!')
    console.log('Possible issues:')
    console.log('• API services may be discontinued')
    console.log('• API endpoints may have changed')
    console.log('• Search parameters may be incorrect')
    console.log('• Geographic restrictions may apply')
  } else {
    console.log('\n🎉 Some APIs are working!')
    results.filter(r => r.success && r.totalResults > 0).forEach(r => {
      console.log(`   - ${r.name}: ${r.totalResults} results`)
    })
  }

  // Show failed APIs
  const failed = results.filter(r => !r.success)
  if (failed.length > 0) {
    console.log('\n❌ Failed APIs:')
    failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`)
    })
  }

  console.log('\n🔍 Detailed Results:')
  results.forEach(result => {
    console.log(`\n${result.name}:`)
    if (result.success) {
      console.log(`   Status: ✅ Working`)
      console.log(`   Results: ${result.totalResults} items`)
      if (result.sampleResult) {
        const title = result.sampleResult.title || result.sampleResult.name || 'Unknown'
        console.log(`   Sample: "${title}"`)
      }
    } else {
      console.log(`   Status: ❌ Failed`)
      console.log(`   Error: ${result.error}`)
    }
  })
}

// Run the test
testAPIs().catch(console.error)
