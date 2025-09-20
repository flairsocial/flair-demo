"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Sparkles, ArrowLeft, DollarSign, Shield, Users, TrendingUp, MessageCircle, ExternalLink } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useFiles } from "@/lib/file-context"
import { useCredits } from "@/lib/credit-context"
import { showOutOfCreditsModal } from "./CreditGuard"
import type { Product } from "@/lib/types"

interface AIAnalysisProps {
  product: Product
  onClose: () => void
}

interface PricingData {
  currentPrice: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  pricePoints: Array<{ platform: string, price: number, color: string }>
  recommendation: string
}

interface TrustData {
  trustScore: number
  reviewCount: number
  avgRating: number
  sentimentBreakdown: { positive: number, negative: number, neutral: number }
  commonIssues: string[]
  recommendation: string
}

interface CompetitorData {
  competitors: Array<{
    title: string
    price: number
    platform: string
    url: string
    image?: string
    savings: number
  }>
  recommendation: string
}

interface ResellData {
  currentValue: number
  maxResellValue: number
  valueHistory: Array<{ date: string, value: number, resell: number }>
  projection: string
  recommendation: string
}

interface AnalysisData {
  pricing: PricingData | null
  trust: TrustData | null
  competitors: CompetitorData | null
  resell: ResellData | null
}

export default function AIAnalysis({ product, onClose }: AIAnalysisProps) {
  const [activeTab, setActiveTab] = useState("pricing")
  const [loading, setLoading] = useState(true)
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    pricing: null,
    trust: null,
    competitors: null,
    resell: null
  })
  const [loadingSteps, setLoadingSteps] = useState({
    pricing: false,
    trust: false,
    competitors: false,
    resell: false
  })
  const router = useRouter()
  const { addProductAsFile } = useFiles()
  const { useCredits: consumeCredits, checkCreditsAvailable, currentPlan } = useCredits()

  // Real AI Analysis using APIs
  useEffect(() => {
    const performRealAnalysis = async () => {
      // Check if user has Plus or Pro subscription tier
      if (currentPlan === 'free') {
        showPricingModal()
        onClose() // Close the analysis modal
        return
      }

      // Check if user has enough credits for AI analysis (10 credits)
      if (!checkCreditsAvailable(10)) {
        showOutOfCreditsModal()
        onClose() // Close the analysis modal
        return
      }

      setLoading(true)

      try {
        // Start all analyses in parallel
        const analysisPromises = [
          analyzePricing(),
          analyzeTrust(),
          findCompetitors(),
          analyzeResellValue()
        ]

        await Promise.all(analysisPromises)

      } catch (error) {
        console.error('AI Analysis failed:', error)
      } finally {
        setLoading(false)
      }
    }

    performRealAnalysis()
  }, [product])

  const analyzePricing = async () => {
    setLoadingSteps(prev => ({ ...prev, pricing: true }))
    
    try {
      const response = await fetch('/api/ai-analysis/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product: {
            title: product.title,
            brand: product.brand,
            category: product.category,
            price: product.price,
            link: product.link
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisData(prev => ({ ...prev, pricing: data }))
        
        // Track credit usage - AI analysis uses 10 credits total
        const creditsUsed = response.headers.get('X-Credits-Used')
        if (creditsUsed) {
          // AI analysis collectively should use 10 credits, so we track it once
          if (!consumeCredits(10)) {
            showOutOfCreditsModal()
            return // Exit if not enough credits
          }
        }
      }
    } catch (error) {
      console.error('Pricing analysis failed:', error)
    } finally {
      setLoadingSteps(prev => ({ ...prev, pricing: false }))
    }
  }

  const analyzeTrust = async () => {
    setLoadingSteps(prev => ({ ...prev, trust: true }))
    
    try {
      const response = await fetch('/api/ai-analysis/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product: {
            title: product.title,
            brand: product.brand,
            category: product.category,
            link: product.link
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisData(prev => ({ ...prev, trust: data }))
      }
    } catch (error) {
      console.error('Trust analysis failed:', error)
    } finally {
      setLoadingSteps(prev => ({ ...prev, trust: false }))
    }
  }

  const findCompetitors = async () => {
    setLoadingSteps(prev => ({ ...prev, competitors: true }))
    
    try {
      const response = await fetch('/api/ai-analysis/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product: {
            title: product.title,
            brand: product.brand,
            category: product.category,
            price: product.price
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisData(prev => ({ ...prev, competitors: data }))
      }
    } catch (error) {
      console.error('Competitors analysis failed:', error)
    } finally {
      setLoadingSteps(prev => ({ ...prev, competitors: false }))
    }
  }

  const analyzeResellValue = async () => {
    setLoadingSteps(prev => ({ ...prev, resell: true }))
    
    try {
      const response = await fetch('/api/ai-analysis/resell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product: {
            title: product.title,
            brand: product.brand,
            category: product.category,
            price: product.price,
            link: product.link
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisData(prev => ({ ...prev, resell: data }))
      }
    } catch (error) {
      console.error('Resell analysis failed:', error)
    } finally {
      setLoadingSteps(prev => ({ ...prev, resell: false }))
    }
  }

  const tabs = [
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "trust", label: "Trust/Scam", icon: Shield },
    { id: "competitors", label: "Competitors", icon: Users },
    { id: "resell", label: "Resell Value", icon: TrendingUp },
  ]

  const handleAskAIComparison = () => {
    addProductAsFile(product)
    onClose()
    
    setTimeout(() => {
      router.push('/chat?autoMessage=' + encodeURIComponent('Is this worth it? Please show me similar competitors and analyze this product for value and quality compared to alternatives.'))
    }, 100)
  }

  const getTrustScoreGradient = (score: number) => {
    if (score >= 85) {
      return "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
    } else if (score >= 75) {
      return "bg-gradient-to-r from-green-500 to-green-600 text-white"
    } else if (score >= 65) {
      return "bg-gradient-to-r from-lime-500 to-green-600 text-white"
    } else if (score >= 55) {
      return "bg-gradient-to-r from-yellow-500 to-lime-600 text-white"
    } else if (score >= 45) {
      return "bg-gradient-to-r from-orange-500 to-yellow-600 text-white"
    } else if (score >= 35) {
      return "bg-gradient-to-r from-red-500 to-orange-600 text-white"
    } else if (score >= 25) {
      return "bg-gradient-to-r from-red-600 to-red-700 text-white"
    } else {
      return "bg-gradient-to-r from-red-700 to-red-800 text-white"
    }
  }

  const getTrustScoreTextColor = (score: number) => {
    if (score >= 75) return "text-green-300"
    if (score >= 55) return "text-yellow-300"
    if (score >= 35) return "text-orange-300"
    return "text-red-300"
  }

  const renderPricingChart = (pricing: PricingData) => {
    const maxPrice = Math.max(...pricing.pricePoints.map(p => p.price))
    
    return (
      <div className="space-y-4">
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <h4 className="text-sm font-medium mb-4">Price Comparison Across Platforms</h4>
          <div className="space-y-3">
            {pricing.pricePoints.map((point, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-20 text-xs text-zinc-400">{point.platform}</div>
                <div className="flex-1 bg-zinc-700 rounded-full h-2 relative">
                  <div 
                    className={`h-2 rounded-full ${point.color}`}
                    style={{ width: `${(point.price / maxPrice) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-xs font-medium text-right">${point.price}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-400">Min Price</p>
            <p className="text-lg font-bold text-green-400">${pricing.minPrice}</p>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-400">Avg Price</p>
            <p className="text-lg font-bold">${pricing.avgPrice}</p>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-400">Max Price</p>
            <p className="text-lg font-bold text-red-400">${pricing.maxPrice}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderResellChart = (resell: ResellData) => {
    return (
      <div className="space-y-4">
        <div className="bg-zinc-800/50 rounded-xl p-4">
          <h4 className="text-sm font-medium mb-4">Value History & Resell Potential</h4>
          <div className="h-40 relative">
            <svg className="w-full h-full" viewBox="0 0 400 160">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line key={i} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="#374151" strokeWidth="0.5" opacity="0.3" />
              ))}
              
              {/* Value line */}
              <polyline
                points={resell.valueHistory.map((point, index) => 
                  `${(index / (resell.valueHistory.length - 1)) * 380 + 10},${160 - (point.value / Math.max(...resell.valueHistory.map(p => Math.max(p.value, p.resell)))) * 140}`
                ).join(' ')}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
              />
              
              {/* Resell line */}
              <polyline
                points={resell.valueHistory.map((point, index) => 
                  `${(index / (resell.valueHistory.length - 1)) * 380 + 10},${160 - (point.resell / Math.max(...resell.valueHistory.map(p => Math.max(p.value, p.resell)))) * 140}`
                ).join(' ')}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
            
            {/* Legend */}
            <div className="absolute top-2 right-2 space-y-1">
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-3 h-0.5 bg-blue-500"></div>
                <span className="text-zinc-400">Market Value</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-3 h-0.5 bg-green-500 border-dashed"></div>
                <span className="text-zinc-400">Resell Value</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-400">Current Value</p>
            <p className="text-lg font-bold">${resell.currentValue}</p>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
            <p className="text-xs text-zinc-400">Max Resell</p>
            <p className="text-lg font-bold text-green-400">${resell.maxResellValue}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-br from-zinc-900/95 via-zinc-800/95 to-zinc-900/95 w-full max-w-7xl h-full md:h-auto md:max-h-[95vh] overflow-y-auto rounded-none md:rounded-2xl border border-zinc-700/50 shadow-2xl backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 w-full p-6 flex justify-between items-center bg-gradient-to-r from-zinc-900/95 via-zinc-800/95 to-zinc-900/95 backdrop-blur-xl border-b border-zinc-700/50">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors mr-4"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">AI Analysis</h2>
                <p className="text-xs text-zinc-400">Powered by Flair Intelligence</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Product Info */}
          <div className="bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 rounded-2xl p-6 mb-8 border border-zinc-700/30">
            <div className="flex items-center">
              <div className="w-24 h-24 bg-zinc-800 rounded-xl overflow-hidden relative shadow-lg">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.title || "Product"}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="ml-6 flex-1">
                <h3 className="text-2xl font-semibold text-white mb-1 leading-tight">{product.title}</h3>
                <p className="text-zinc-400 text-lg mb-2">{product.brand}</p>
                <div className="flex items-center space-x-4">
                  <span className="text-3xl font-bold text-white">${product.price}</span>
                  <div className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                    <span className="text-sm text-blue-300 font-medium">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping"></div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">AI Analysis in Progress</h3>
                <p className="text-zinc-400">Flair Intelligence is analyzing this product...</p>
              </div>

              {/* Loading steps */}
              <div className="w-full max-w-md space-y-3">
                {Object.entries(loadingSteps).map(([step, isActive]) => (
                  <div key={step} className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-zinc-800/30'}`}>
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                    <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? 'text-blue-300' : 'text-zinc-400'}`}>
                      Analyzing {step.charAt(0).toUpperCase() + step.slice(1)}...
                    </span>
                    {isActive && (
                      <div className="ml-auto">
                        <div className="w-4 h-4 border border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <p className="text-xs text-zinc-500">This may take a few moments</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-6 border-b border-zinc-800">
                <div className="flex overflow-x-auto scrollbar-hide -mx-2 px-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const hasData = analysisData[tab.id as keyof AnalysisData] !== null
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 md:px-4 py-3 flex items-center whitespace-nowrap relative flex-shrink-0 ${
                          activeTab === tab.id ? "text-white" : hasData ? "text-zinc-400" : "text-zinc-600"
                        }`}
                        disabled={!hasData}
                      >
                        <Icon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        <span className="text-xs md:text-sm">{tab.label}</span>
                        {!hasData && <div className="w-1 h-1 bg-yellow-500 rounded-full ml-2"></div>}
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTabLine"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="mb-8">
                {activeTab === "pricing" && (
                  <div>
                    {analysisData.pricing ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Price Analysis</h3>
                          <div className={`text-2xl font-bold ${
                            product.price <= analysisData.pricing.avgPrice ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ${product.price} vs ${analysisData.pricing.avgPrice} avg
                          </div>
                        </div>
                        
                        {renderPricingChart(analysisData.pricing)}
                        
                        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-900/30">
                          <h4 className="text-sm font-medium text-blue-300 mb-2">AI Recommendation</h4>
                          <p className="text-sm text-blue-200">{analysisData.pricing.recommendation}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin mx-auto mb-2"></div>
                        <p className="text-zinc-400">Loading pricing analysis...</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "trust" && (
                  <div>
                    {analysisData.trust ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Trust & Safety Analysis</h3>
                          <div className={`px-4 py-2 rounded-full text-md ${getTrustScoreGradient(analysisData.trust.trustScore)}`}>
                            {analysisData.trust.trustScore}% Trust Score
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                            <p className="text-xs text-zinc-400">Trust Score</p>
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-lg font-bold ${getTrustScoreGradient(analysisData.trust.trustScore)}`}>
                              {analysisData.trust.trustScore}%
                            </div>
                          </div>
                          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                            <p className="text-xs text-zinc-400">Reviews</p>
                            <p className="text-xl font-bold">
                              {analysisData.trust.reviewCount > 0 ? analysisData.trust.reviewCount.toLocaleString() : 'No data'}
                            </p>
                          </div>
                          <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                            <p className="text-xs text-zinc-400">Avg Rating</p>
                            <p className="text-xl font-bold">
                              {analysisData.trust.avgRating > 0 ? `${analysisData.trust.avgRating}/5` : 'No data'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-zinc-800/50 rounded-xl p-4">
                          <h4 className="text-sm font-medium mb-3">Sentiment Breakdown</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-green-400">Positive</span>
                              <span className="text-sm">{analysisData.trust.sentimentBreakdown.positive}%</span>
                            </div>
                            <div className="w-full bg-zinc-700 rounded-full h-2">
                              <div 
                                className="h-2 bg-green-500 rounded-full"
                                style={{ width: `${analysisData.trust.sentimentBreakdown.positive}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-yellow-400">Neutral</span>
                              <span className="text-sm">{analysisData.trust.sentimentBreakdown.neutral}%</span>
                            </div>
                            <div className="w-full bg-zinc-700 rounded-full h-2">
                              <div 
                                className="h-2 bg-yellow-500 rounded-full"
                                style={{ width: `${analysisData.trust.sentimentBreakdown.neutral}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-400">Negative</span>
                              <span className="text-sm">{analysisData.trust.sentimentBreakdown.negative}%</span>
                            </div>
                            <div className="w-full bg-zinc-700 rounded-full h-2">
                              <div 
                                className="h-2 bg-red-500 rounded-full"
                                style={{ width: `${analysisData.trust.sentimentBreakdown.negative}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {analysisData.trust.commonIssues.length > 0 && (
                          <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-900/30">
                            <h4 className="text-sm font-medium text-yellow-300 mb-2">Common Issues</h4>
                            <ul className="space-y-1">
                              {analysisData.trust.commonIssues.map((issue, index) => (
                                <li key={index} className="text-sm text-yellow-200 flex items-start">
                                  <span className="text-yellow-400 mr-2">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-900/30">
                          <h4 className="text-sm font-medium text-blue-300 mb-2">AI Recommendation</h4>
                          <p className="text-sm text-blue-200">{analysisData.trust.recommendation}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin mx-auto mb-2"></div>
                        <p className="text-zinc-400">Loading trust analysis...</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "competitors" && (
                  <div>
                    {analysisData.competitors ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Cheaper Alternatives</h3>
                          <p className="text-sm text-zinc-400">
                            Found {analysisData.competitors.competitors.length} alternatives
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          {analysisData.competitors.competitors.map((competitor, index) => (
                            <div key={index} className="bg-zinc-800/50 rounded-xl p-4 flex items-center space-x-4">
                              <div className="w-16 h-16 bg-zinc-700 rounded-lg overflow-hidden relative flex-shrink-0">
                                {competitor.image && (
                                  <Image
                                    src={competitor.image}
                                    alt={competitor.title}
                                    fill
                                    className="object-cover"
                                  />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{competitor.title}</h4>
                                <p className="text-sm text-zinc-400">{competitor.platform}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="font-bold text-green-400">${competitor.price}</span>
                                  <span className="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded">
                                    Save ${competitor.savings}
                                  </span>
                                </div>
                              </div>
                              
                              <a
                                href={competitor.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>

                        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-900/30">
                          <h4 className="text-sm font-medium text-blue-300 mb-2">AI Recommendation</h4>
                          <p className="text-sm text-blue-200">{analysisData.competitors.recommendation}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin mx-auto mb-2"></div>
                        <p className="text-zinc-400">Finding competitors...</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "resell" && (
                  <div>
                    {analysisData.resell ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Resell Value Analysis</h3>
                          <div className="text-right">
                            <p className="text-sm text-zinc-400">Resell Potential</p>
                            <p className="text-xl font-bold text-green-400">${analysisData.resell.maxResellValue}</p>
                          </div>
                        </div>
                        
                        {renderResellChart(analysisData.resell)}
                        
                        <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-900/30">
                          <h4 className="text-sm font-medium text-purple-300 mb-2">Market Projection</h4>
                          <p className="text-sm text-purple-200 mb-3">{analysisData.resell.projection}</p>
                          
                          <h4 className="text-sm font-medium text-purple-300 mb-2">AI Recommendation</h4>
                          <p className="text-sm text-purple-200">{analysisData.resell.recommendation}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin mx-auto mb-2"></div>
                        <p className="text-zinc-400">Analyzing resell value...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ask AI Comparison Button */}
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-xl p-4 border border-blue-900/30">
                <div className="flex items-center mb-3">
                  <Sparkles className="w-5 h-5 text-blue-400 mr-2" strokeWidth={1.5} />
                  <h3 className="text-md font-medium text-blue-300">Ask AI for More Insights</h3>
                </div>
                
                <button
                  onClick={handleAskAIComparison}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                  <span>Ask AI: Is this worth it? Show me more details</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
