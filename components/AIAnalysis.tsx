"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Sparkles, ArrowLeft, BarChart3, Leaf, DollarSign, Shirt, MessageCircle } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useFiles } from "@/lib/file-context"
import type { Product } from "@/lib/types"

interface AIAnalysisProps {
  product: Product
  onClose: () => void
}

export default function AIAnalysis({ product, onClose }: AIAnalysisProps) {
  const [activeTab, setActiveTab] = useState("style")
  const [loading, setLoading] = useState(true)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const router = useRouter()
  const { addProductAsFile } = useFiles()

  // Mock data generation for the demo
  useEffect(() => {
    const generateMockData = () => {
      setLoading(true)

      // Simulate API call delay
      setTimeout(() => {
        const mockData = {
          styleMatch: Math.floor(Math.random() * 30) + 70, // 70-99
          quality: Math.floor(Math.random() * 20) + 80, // 80-99
          sustainability: Math.floor(Math.random() * 40) + 60, // 60-99
          value: Math.floor(Math.random() * 50) + 50, // 50-99
          styleCompatibility: {
            wardrobeMatch: Math.floor(Math.random() * 30) + 70,
            versatility: Math.floor(Math.random() * 20) + 80,
            trendiness: Math.floor(Math.random() * 40) + 60,
          },
          seasonalSuitability: {
            spring: Math.floor(Math.random() * 40) + 60,
            summer: Math.floor(Math.random() * 40) + 60,
            fall: Math.floor(Math.random() * 40) + 60,
            winter: Math.floor(Math.random() * 40) + 60,
          },
          recommendations: [
            `This ${product.category?.toLowerCase() || "item"} would pair well with ${product.category === "Tops" ? "dark jeans and minimalist sneakers" : product.category === "Bottoms" ? "a crisp white shirt or casual tee" : "your existing wardrobe staples"}`,
            `Consider ${product.brand === "Maison Noir" ? "layering with contrasting textures" : "accessorizing minimally to highlight the design"}`,
            `Based on your style profile, this would ${Math.random() > 0.5 ? "complement your existing collection" : "add a versatile new element to your wardrobe"}`,
          ],
          materialAnalysis: {
            quality: Math.floor(Math.random() * 20) + 80,
            durability: Math.floor(Math.random() * 30) + 70,
            comfort: Math.floor(Math.random() * 20) + 80,
          },
          sustainabilityAnalysis: {
            materials: Math.floor(Math.random() * 40) + 60,
            production: Math.floor(Math.random() * 40) + 60,
            carbonFootprint: Math.floor(Math.random() * 40) + 60,
          },
          valueAnalysis: {
            priceComparison: Math.floor(Math.random() * 40) + 60,
            costPerWear: Math.floor(Math.random() * 30) + 70,
            investmentPotential: Math.floor(Math.random() * 40) + 60,
          },
        }

        setAnalysisData(mockData)
        setLoading(false)
      }, 1500)
    }

    generateMockData()
  }, [product])

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500"
    if (score >= 80) return "bg-green-500"
    if (score >= 70) return "bg-lime-500"
    if (score >= 60) return "bg-yellow-500"
    return "bg-orange-500"
  }

  // Get text color based on score
  const getScoreTextColor = (score: number) => {
    if (score >= 90) return "text-emerald-500"
    if (score >= 80) return "text-green-500"
    if (score >= 70) return "text-lime-500"
    if (score >= 60) return "text-yellow-500"
    return "text-orange-500"
  }

  const tabs = [
    { id: "style", label: "Style", icon: Shirt },
    { id: "material", label: "Material & Quality", icon: BarChart3 },
    { id: "sustainability", label: "Sustainability", icon: Leaf },
    { id: "value", label: "Value", icon: DollarSign },
  ]

  const handleAskAIComparison = () => {
    console.log('[AIAnalysis] Ask AI comparison clicked - adding product to files')
    // Add product as file attachment first
    addProductAsFile(product)
    
    // Close the modal
    onClose()
    
    // Small delay to ensure file context is updated, then navigate
    setTimeout(() => {
      console.log('[AIAnalysis] Navigating to chat with competitor analysis auto-message')
      router.push('/chat?autoMessage=' + encodeURIComponent('Is this worth it? Please show me similar competitors and analyze this product for value and quality compared to alternatives.'))
    }, 100)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-zinc-900 w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-y-auto rounded-none md:rounded-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 w-full p-4 flex justify-between items-center bg-black/70 backdrop-blur-md border-b border-zinc-800">
          <div className="flex items-center">
            <button onClick={onClose} className="p-2 rounded-full bg-zinc-800/80 mr-3" aria-label="Back">
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-white mr-2" strokeWidth={1.5} />
              <h2 className="text-lg font-medium">AI Analysis</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-800/80" aria-label="Close">
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 md:p-6">
          {/* Product Info */}
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-lg overflow-hidden relative">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.title || "Product"}
                fill
                className="object-cover"
              />
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-medium">{product.title}</h3>
              <p className="text-zinc-400">{product.brand}</p>
              <p className="text-white font-medium">${product.price}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-white animate-spin mb-4"></div>
              <p className="text-zinc-400">Flair AI is analyzing this item...</p>
            </div>
          ) : (
            <>
              {/* AI Analysis Summary */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <Sparkles className="w-5 h-5 text-white mr-2" strokeWidth={1.5} />
                  <h3 className="text-lg font-medium">AI Analysis Summary</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center">
                    <p className="text-sm text-zinc-400 mb-1">Style Match</p>
                    <p className={`text-2xl font-bold ${getScoreTextColor(analysisData.styleMatch)}`}>
                      {analysisData.styleMatch}%
                    </p>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${getScoreColor(analysisData.styleMatch)}`}
                        style={{ width: `${analysisData.styleMatch}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center">
                    <p className="text-sm text-zinc-400 mb-1">Quality</p>
                    <p className={`text-2xl font-bold ${getScoreTextColor(analysisData.quality)}`}>
                      {analysisData.quality}%
                    </p>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${getScoreColor(analysisData.quality)}`}
                        style={{ width: `${analysisData.quality}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center">
                    <p className="text-sm text-zinc-400 mb-1">Sustainability</p>
                    <p className={`text-2xl font-bold ${getScoreTextColor(analysisData.sustainability)}`}>
                      {analysisData.sustainability}%
                    </p>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${getScoreColor(analysisData.sustainability)}`}
                        style={{ width: `${analysisData.sustainability}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 rounded-xl p-4 flex flex-col items-center">
                    <p className="text-sm text-zinc-400 mb-1">Value</p>
                    <p className={`text-2xl font-bold ${getScoreTextColor(analysisData.value)}`}>
                      {analysisData.value}%
                    </p>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${getScoreColor(analysisData.value)}`}
                        style={{ width: `${analysisData.value}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-6 border-b border-zinc-800">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 flex items-center whitespace-nowrap relative ${
                          activeTab === tab.id ? "text-white" : "text-zinc-500"
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        <span className="text-sm">{tab.label}</span>
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
                {activeTab === "style" && (
                  <div>
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-3">Style Compatibility</h4>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <p className="text-sm text-zinc-400">Match with Your Wardrobe</p>
                            <p className="text-sm font-medium">{analysisData.styleCompatibility.wardrobeMatch}%</p>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getScoreColor(analysisData.styleCompatibility.wardrobeMatch)}`}
                              style={{ width: `${analysisData.styleCompatibility.wardrobeMatch}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <p className="text-sm text-zinc-400">Versatility</p>
                            <p className="text-sm font-medium">{analysisData.styleCompatibility.versatility}%</p>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getScoreColor(analysisData.styleCompatibility.versatility)}`}
                              style={{ width: `${analysisData.styleCompatibility.versatility}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <p className="text-sm text-zinc-400">Trendiness</p>
                            <p className="text-sm font-medium">{analysisData.styleCompatibility.trendiness}%</p>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getScoreColor(analysisData.styleCompatibility.trendiness)}`}
                              style={{ width: `${analysisData.styleCompatibility.trendiness}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3">Seasonal Suitability</h4>
                      <div className="bg-zinc-800/50 rounded-xl p-4">
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${getScoreColor(analysisData.seasonalSuitability.spring)}`}
                                style={{ width: `${analysisData.seasonalSuitability.spring}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-center">Spring</p>
                            <p className="text-xs text-zinc-400">{analysisData.seasonalSuitability.spring}%</p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${getScoreColor(analysisData.seasonalSuitability.summer)}`}
                                style={{ width: `${analysisData.seasonalSuitability.summer}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-center">Summer</p>
                            <p className="text-xs text-zinc-400">{analysisData.seasonalSuitability.summer}%</p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${getScoreColor(analysisData.seasonalSuitability.fall)}`}
                                style={{ width: `${analysisData.seasonalSuitability.fall}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-center">Fall</p>
                            <p className="text-xs text-zinc-400">{analysisData.seasonalSuitability.fall}%</p>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${getScoreColor(analysisData.seasonalSuitability.winter)}`}
                                style={{ width: `${analysisData.seasonalSuitability.winter}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-center">Winter</p>
                            <p className="text-xs text-zinc-400">{analysisData.seasonalSuitability.winter}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "material" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Material Quality</p>
                        <p className="text-sm font-medium">{analysisData.materialAnalysis.quality}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.materialAnalysis.quality)}`}
                          style={{ width: `${analysisData.materialAnalysis.quality}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Durability</p>
                        <p className="text-sm font-medium">{analysisData.materialAnalysis.durability}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.materialAnalysis.durability)}`}
                          style={{ width: `${analysisData.materialAnalysis.durability}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Comfort</p>
                        <p className="text-sm font-medium">{analysisData.materialAnalysis.comfort}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.materialAnalysis.comfort)}`}
                          style={{ width: `${analysisData.materialAnalysis.comfort}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 mt-6">
                      <h4 className="text-sm font-medium mb-2">Material Composition</h4>
                      <p className="text-sm text-zinc-400">
                        This {product.category?.toLowerCase() || "item"} is made with high-quality materials that
                        balance comfort and durability. The fabric has a premium feel and is likely to maintain its
                        appearance after multiple washes.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "sustainability" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Sustainable Materials</p>
                        <p className="text-sm font-medium">{analysisData.sustainabilityAnalysis.materials}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.sustainabilityAnalysis.materials)}`}
                          style={{ width: `${analysisData.sustainabilityAnalysis.materials}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Production Ethics</p>
                        <p className="text-sm font-medium">{analysisData.sustainabilityAnalysis.production}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.sustainabilityAnalysis.production)}`}
                          style={{ width: `${analysisData.sustainabilityAnalysis.production}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Carbon Footprint</p>
                        <p className="text-sm font-medium">{analysisData.sustainabilityAnalysis.carbonFootprint}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.sustainabilityAnalysis.carbonFootprint)}`}
                          style={{ width: `${analysisData.sustainabilityAnalysis.carbonFootprint}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 mt-6">
                      <h4 className="text-sm font-medium mb-2">Sustainability Overview</h4>
                      <p className="text-sm text-zinc-400">
                        {product.brand} has made moderate efforts toward sustainability with this product. The materials
                        used have a {analysisData.sustainabilityAnalysis.materials > 75 ? "lower" : "moderate"}{" "}
                        environmental impact, and the production process follows{" "}
                        {analysisData.sustainabilityAnalysis.production > 75 ? "strong" : "standard"} ethical
                        guidelines.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "value" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Price Comparison</p>
                        <p className="text-sm font-medium">{analysisData.valueAnalysis.priceComparison}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.valueAnalysis.priceComparison)}`}
                          style={{ width: `${analysisData.valueAnalysis.priceComparison}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Cost Per Wear</p>
                        <p className="text-sm font-medium">{analysisData.valueAnalysis.costPerWear}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.valueAnalysis.costPerWear)}`}
                          style={{ width: `${analysisData.valueAnalysis.costPerWear}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm text-zinc-400">Investment Potential</p>
                        <p className="text-sm font-medium">{analysisData.valueAnalysis.investmentPotential}%</p>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getScoreColor(analysisData.valueAnalysis.investmentPotential)}`}
                          style={{ width: `${analysisData.valueAnalysis.investmentPotential}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-4 mt-6">
                      <h4 className="text-sm font-medium mb-2">Value Assessment</h4>
                      <p className="text-sm text-zinc-400">
                        At ${product.price}, this item is priced{" "}
                        {analysisData.valueAnalysis.priceComparison > 75 ? "competitively" : "at a premium"} compared to
                        similar products. Given its quality and versatility, the cost per wear is{" "}
                        {analysisData.valueAnalysis.costPerWear > 75 ? "excellent" : "reasonable"}, making it a{" "}
                        {analysisData.valueAnalysis.investmentPotential > 75 ? "strong" : "moderate"} investment for
                        your wardrobe.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Recommendations */}
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-xl p-4 border border-blue-900/30">
                <div className="flex items-center mb-3">
                  <Sparkles className="w-5 h-5 text-blue-400 mr-2" strokeWidth={1.5} />
                  <h3 className="text-md font-medium text-blue-300">AI Recommendations</h3>
                </div>
                <ul className="space-y-2 mb-4">
                  {analysisData.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <p className="text-sm text-blue-200">{rec}</p>
                    </li>
                  ))}
                </ul>
                
                {/* Ask AI Comparison Button */}
                <button
                  onClick={handleAskAIComparison}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                  <span>Ask AI: Is this worth it? Show competitors</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
