"use client"

import { useState } from "react"
import { Check, Crown, Sparkles, Building2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [selectedTab, setSelectedTab] = useState<"personal" | "business">("personal")

  const personalPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Limited access for everyday tasks",
      features: [
        "50-75% AI accuracy only",
        "Limited 50 credit usage",
        "Limited product discovery",
        "Limited file uploads",
        "Limited search functionality"
      ],
      buttonText: "Current Plan",
      buttonDisabled: true,
      icon: null,
      popular: false
    },
    {
      name: "Plus",
      price: "$10",
      period: "USD / month",
      description: "Unlimited AI access with advanced features",
      features: [
        "Unlimited AI usage with high accuracy",
        "Fast response times",
        "Deep link generation",
        "Advanced web scraping",
        "Advanced file management",
        "Priority support",
        "Enhanced product analysis",
        "Custom AI recommendations"
      ],
      buttonText: "Get Free",
      buttonDisabled: false,
      icon: <Sparkles className="w-4 h-4" />,
      popular: true
    },
    {
      name: "Pro",
      price: "?",
      period: "coming soon",
      description: "Professional features for power users",
      features: [
        "Everything in Plus",
        "Advanced analytics",
        "Custom integrations",
        "Team collaboration",
        "API access",
        "White-label options",
        "Premium support",
        "Early access to new features"
      ],
      buttonText: "Coming Soon",
      buttonDisabled: true,
      icon: <Crown className="w-4 h-4" />,
      popular: false
    }
  ]

  const businessPlans = [
    {
      name: "Business",
      price: "$20",
      period: "USD / month",
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
      contactEmail: "admin@flair.social"
    }
  ]

  const handleContactAdmin = () => {
    window.open("mailto:admin@flair.social?subject=Business Plan Inquiry", "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-3xl font-semibold">Upgrade your plan</DialogTitle>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex justify-center mb-8">
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
        <div className={`grid gap-6 ${selectedTab === "personal" ? "md:grid-cols-3" : "md:grid-cols-1 max-w-md mx-auto"}`}>
          {(selectedTab === "personal" ? personalPlans : businessPlans).map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                plan.popular
                  ? "border-blue-500 bg-gradient-to-b from-blue-950/50 to-zinc-900"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {plan.icon}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-400 text-sm ml-1">{plan.period}</span>
                </div>
                <p className="text-zinc-400 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : plan.buttonDisabled
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
                disabled={plan.buttonDisabled}
                onClick={plan.name === "Business" ? handleContactAdmin : undefined}
              >
                {plan.buttonText}
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
