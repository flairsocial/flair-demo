import { NextResponse } from "next/server"
import * as cheerio from "cheerio"

export const runtime = "nodejs" // Step 1: Use Node.js runtime

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    console.log("[scrape-image API] Error: Missing URL parameter")
    return NextResponse.json({ error: "Missing URL" }, { status: 400 })
  }

  console.log(`[scrape-image API] Attempting to scrape: ${targetUrl}`)

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000), // 8-second timeout
    })

    if (!response.ok) {
      console.error(`[scrape-image API] Failed to fetch URL ${targetUrl}. Status: ${response.status}`)
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: response.status })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    let imageUrl = null
    // Prioritize Open Graph image
    imageUrl = $('meta[property="og:image"]').attr("content")
    if (imageUrl) {
      console.log(`[scrape-image API] Found og:image: ${imageUrl} for ${targetUrl}`)
    }

    // Fallback to Twitter image if Open Graph is not found
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr("content")
      if (imageUrl) {
        console.log(`[scrape-image API] Found twitter:image: ${imageUrl} for ${targetUrl}`)
      }
    }

    // Fallback to another common Twitter image property
    if (!imageUrl) {
      imageUrl = $('meta[property="twitter:image"]').attr("content")
      if (imageUrl) {
        console.log(`[scrape-image API] Found property="twitter:image": ${imageUrl} for ${targetUrl}`)
      }
    }

    // Ensure the URL is absolute
    if (imageUrl && !imageUrl.startsWith("http")) {
      try {
        const base = new URL(targetUrl)
        imageUrl = new URL(imageUrl, base.origin).href
        console.log(`[scrape-image API] Resolved relative URL to: ${imageUrl}`)
      } catch (e) {
        console.error(
          `[scrape-image API] Error resolving relative URL '${imageUrl}' for base '${targetUrl}':`,
          e.message,
        )
        imageUrl = null // Invalidate if resolution fails
      }
    }

    if (imageUrl) {
      console.log(`[scrape-image API] Successfully scraped image for ${targetUrl}: ${imageUrl}`)
      return NextResponse.json({ image: imageUrl })
    } else {
      console.log(`[scrape-image API] No suitable image meta tag (og:image or twitter:image) found for ${targetUrl}`)
      return NextResponse.json({ image: null, message: "No og:image or twitter:image found" })
    }
  } catch (error) {
    console.error(`[scrape-image API] Error scraping ${targetUrl}:`, error.message, error.name)
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      // AbortSignal.timeout throws TimeoutError
      return NextResponse.json({ error: "Request to target URL timed out" }, { status: 504 })
    }
    return NextResponse.json(
      { error: "Failed to fetch or parse image from target URL.", details: error.message },
      { status: 500 },
    )
  }
}
