"use client"

import { useState, useEffect } from "react"
import { Check, Crown, Sparkles, Building2, Star, Quote } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCredits } from "@/lib/credit-context"

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

const customerReviews = [
  {
    name: "Sarah Chen",
    role: "Fashion Reseller",
    review: "This AI has completely transformed my business. I can find trending items 10x faster than before.",
    rating: 5,
    avatar: "SC"
  },
  {
    name: "Marcus Rodriguez",
    role: "E-commerce Entrepreneur",
    review: "The fraud detection feature saved me from several bad deals. Worth every penny!",
    rating: 5,
    avatar: "MR"
  },
  {
    name: "Emma Thompson",
    role: "Boutique Owner",
    review: "Smart shopping cart feature helps me manage inventory across multiple platforms seamlessly.",
    rating: 5,
    avatar: "ET"
  },
  {
    name: "David Kim",
    role: "Wholesale Buyer",
    review: "AI deal discovery found me suppliers I never would have found manually. ROI is incredible.",
    rating: 5,
    avatar: "DK"
  },
  {
    name: "Lisa Parker",
    role: "Fashion Consultant",
    review: "The accuracy is unmatched. My clients love the personalized recommendations.",
    rating: 5,
    avatar: "LP"
  },
  {
    name: "James Wilson",
    role: "Retail Manager",
    review: "Deep link generation streamlined our entire product sourcing process.",
    rating: 5,
    avatar: "JW"
  }
]

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [selectedTab, setSelectedTab] = useState<"personal" | "business">("personal")
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'plus' | 'pro' | null>(null)
  const { setPlan, currentPlan } = useCredits()

  // Auto-scroll reviews
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % customerReviews.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Initialize selected plan to current plan
  useEffect(() => {
    if (!selectedPlan) {
      setSelectedPlan(currentPlan)
    }
  }, [currentPlan, selectedPlan])

  const handleUpgrade = (planType: 'plus' | 'pro') => {
    setPlan(planType)
    onClose() // Close modal after upgrade
  }

  const ReviewsCarousel = () => (
    <div className="relative overflow-hidden py-4 sm:py-6 bg-zinc-900/30 rounded-lg border border-zinc-800/50 mb-4 sm:mb-8">
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentReviewIndex * 100}%)` }}
      >
        {customerReviews.map((review, index) => (
          <div key={index} className="w-full flex-shrink-0 px-3 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="flex justify-center mb-2">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <Quote className="w-4 h-4 sm:w-6 sm:h-6 text-zinc-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-zinc-300 text-xs sm:text-sm italic mb-3 sm:mb-4">"{review.review}"</p>
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium text-white mr-2 sm:mr-3">
                  {review.avatar}
                </div>
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium text-white">{review.name}</p>
                  <p className="text-xs text-zinc-400">{review.role}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Dots indicator */}
      <div className="flex justify-center mt-3 sm:mt-4 space-x-1">
        {customerReviews.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentReviewIndex(index)}
            className={`w-1 h-1 sm:w-2 sm:h-2 rounded-full transition-colors ${
              index === currentReviewIndex ? 'bg-blue-500' : 'bg-zinc-600'
            }`}
          />
        ))}
      </div>
    </div>
  )

  const personalPlans = [
    {
      name: "Free",
      price: "$0",
      period: " /forever",
      description: "Limited access for everyday tasks",
      features: [
        "50 Daily Credits",
        "50-75% AI accuracy only",
        "Limited product discovery",
        "Limited file navigation",
        "Limited search functionality"
      ],
      buttonText: currentPlan === "free" ? "Current Plan" : "Switch to Free",
      buttonDisabled: false,
      icon: null,
      popular: false,
      planType: "free" as const
    },
    {
      name: "Plus",
      price: "$2.99",
      period: "/ Month",
      description: "Full AI access for Individuals",
      features: [
        "500 Daily Credits",
        "Deep link generation",
        "Competitive Pricing Analysis",
        "Exclusive AI Deal Discovery",
        "Fraud / Product Scam Detection",
        "Marketplaces, Vendors, and Suppliers"
      ],
      buttonText: currentPlan === "plus" ? "Current Plan" : "Upgrade to Plus",
      buttonDisabled: false,
      icon: <Sparkles className="w-4 h-4" />,
      popular: currentPlan === "free", // Popular if user is on free
      planType: "plus" as const
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "/ Month",
      description: "Professional features for resellers",
      features: [
        "5,000 Daily Credits",
        "Everything in Plus",
        "Advanced Resale Analytics",
        "ROI and Listings Dashboard",
        "Sell and Monitor Profits",
        "24/7 Customer Support",
 
      ],
      buttonText: currentPlan === "pro" ? "Current Plan" : "Upgrade to Pro",
      buttonDisabled: false,
      icon: <Crown className="w-4 h-4" />,
      popular: currentPlan === "plus", // Popular if user is on plus
      planType: "pro" as const
    }
  ]

  const businessPlans = [
    {
      name: "Business",
      price: "$50",
      period: "/ Month",
      description: "Everything Plus has, with business-grade features",
      features: [
        "Everything in Plus",
        "Team management",
        "Advanced analytics dashboard",
        "Custom branding options",
        "Priority customer support",
        "Advanced API access",
        "Custom integrations",
        "Dedicated account manager"
      ],
      buttonText: "Contact Admin",
      buttonDisabled: false,
      icon: <Building2 className="w-4 h-4" />,
      popular: true,
      contactEmail: "admin@flair.social",
      planType: undefined
    }
  ]

  const handleContactAdmin = () => {
    window.open("mailto:admin@flair.social?subject=Business Plan Inquiry", "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto bg-black border-zinc-800 text-white p-6">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-xl text-center italic  mb-2">Choose your plan</DialogTitle>
          
        </DialogHeader>

        {/* Customer Reviews Carousel */}
        <ReviewsCarousel />

        {/* Tab Selector */}
        <div className="flex justify-center mb-4">
          <div className="bg-zinc-900 p-1 rounded-full flex">
            <button
              onClick={() => setSelectedTab("personal")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTab === "personal"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setSelectedTab("business")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTab === "business"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Business
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className={`grid gap-6 ${selectedTab === "personal" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 max-w-md mx-auto"}`}>
          {(selectedTab === "personal" ? personalPlans : businessPlans).map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl transition-all cursor-pointer border ${
                plan.popular
                  ? "border-blue-500 bg-gradient-to-b from-blue-950/20 to-black shadow-blue-500/20 shadow-lg"
                  : plan.planType === currentPlan
                  ? "border-green-500 bg-gradient-to-b from-green-950/20 to-black"
                  : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
              }`}
              onClick={() => {
                if (plan.planType) {
                  setSelectedPlan(plan.planType)
                }
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    POPULAR
                  </span>
                </div>
              )}

              {plan.planType === currentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    CURRENT PLAN
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {plan.icon && <div className="w-4 h-4 flex items-center justify-center">{plan.icon}</div>}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                </div>
                <div className="mb-3">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3 text-gray-300">What's included</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className={`w-full py-3 text-sm font-medium rounded-lg ${
                  plan.planType === currentPlan
                    ? "bg-green-600 hover:bg-green-700 text-white cursor-default"
                    : plan.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                }`}
                disabled={plan.planType === currentPlan}
                onClick={(e) => {
                  e.stopPropagation()
                  if (plan.name === "Business") {
                    handleContactAdmin()
                  } else if (plan.planType && plan.planType !== currentPlan) {
                    if (plan.planType === 'free') {
                      setPlan('free')
                      onClose()
                    } else {
                      handleUpgrade(plan.planType)
                    }
                  }
                }}
              >
                {plan.planType === currentPlan ? "Current Plan" : 
                 plan.planType === selectedPlan ? `Switch to ${plan.name}` : 
                 plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        {/* Business Plan Notice */}
        {selectedTab === "business" && (
          <div className="text-center mt-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <Building2 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-2">Need more capabilities for your business?</h4>
            <p className="text-sm text-zinc-400">
              Contact our team at{" "}
              <a 
                href="mailto:admin@flair.social"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                admin@flair.social
              </a>
              {" "}to set up your Business plan
            </p>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center mt-6 pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            The Plus plan utilizes our advanced PyBackend AI system for enhanced reasoning and analysis.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
