'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProfile } from '@/lib/profile-context'

interface StyleRotationState {
  currentStyleIndex: number
  lastRotationTime: number
}

const STORAGE_KEY = 'discover-style-rotation'

/**
 * Hook for managing style rotation and profile-enhanced search queries
 */
export function useProfileEnhancedSearch() {
  const { profile, isLoaded: profileLoaded } = useProfile()
  const [rotationState, setRotationState] = useState<StyleRotationState>({
    currentStyleIndex: 0,
    lastRotationTime: Date.now()
  })

  // Load rotation state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setRotationState(parsed)
      } catch (error) {
        console.error('Failed to parse stored rotation state:', error)
      }
    }
  }, [])

  // Save rotation state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rotationState))
  }, [rotationState])

  /**
   * Get the current style from the rotation
   */
  const getCurrentStyle = useCallback(() => {
    if (!profile.style || profile.style.length === 0) {
      return null
    }
    return profile.style[rotationState.currentStyleIndex % profile.style.length]
  }, [profile.style, rotationState.currentStyleIndex])

  /**
   * Rotate to the next style in the user's preferences
   */
  const rotateToNextStyle = useCallback(() => {
    if (!profile.style || profile.style.length <= 1) {
      return // No rotation needed if 0 or 1 styles
    }

    setRotationState(prev => ({
      currentStyleIndex: (prev.currentStyleIndex + 1) % profile.style.length,
      lastRotationTime: Date.now()
    }))
  }, [profile.style])

  /**
   * Build an enhanced search query with gender and current style
   */
  const buildEnhancedQuery = useCallback((baseQuery: string = '') => {
    const queryParts: string[] = []
    
    // Add base query if provided
    if (baseQuery.trim()) {
      queryParts.push(baseQuery.trim())
    }

    // Add gender context
    if (profile.gender && profile.gender !== 'Prefer not to say') {
      const genderMap = {
        'Male': 'mens',
        'Female': 'womens',
        'Non-binary': 'unisex'
      }
      const genderTerm = genderMap[profile.gender as keyof typeof genderMap] || profile.gender.toLowerCase()
      queryParts.push(genderTerm)
    }

    // Add current style from rotation
    const currentStyle = getCurrentStyle()
    if (currentStyle) {
      queryParts.push(currentStyle.toLowerCase())
    }

    // Add "clothing" or "fashion" if no base query
    if (!baseQuery.trim()) {
      queryParts.push('fashion clothing')
    }

    const finalQuery = queryParts.join(' ')
    console.log('[ProfileEnhancedSearch] Enhanced query:', finalQuery, {
      baseQuery,
      gender: profile.gender,
      currentStyle,
      allStyles: profile.style
    })

    return finalQuery
  }, [profile.gender, getCurrentStyle])

  /**
   * Get enhanced query and auto-rotate for discover page refreshes
   */
  const getDiscoverQuery = useCallback((shouldRotate: boolean = false) => {
    // Rotate style if requested and user has multiple styles
    if (shouldRotate && profile.style && profile.style.length > 1) {
      rotateToNextStyle()
    }

    return buildEnhancedQuery()
  }, [buildEnhancedQuery, rotateToNextStyle, profile.style])

  /**
   * Get profile-based search suggestions
   */
  const getSearchSuggestions = useCallback(() => {
    const suggestions: string[] = []
    
    if (profile.style && profile.style.length > 0) {
      // Create suggestions based on user's style preferences
      profile.style.forEach(style => {
        if (profile.gender && profile.gender !== 'Prefer not to say') {
          const genderMap = {
            'Male': 'mens',
            'Female': 'womens',
            'Non-binary': 'unisex'
          }
          const genderTerm = genderMap[profile.gender as keyof typeof genderMap] || profile.gender.toLowerCase()
          suggestions.push(`${genderTerm} ${style.toLowerCase()} clothing`)
        } else {
          suggestions.push(`${style.toLowerCase()} fashion`)
        }
      })
    }

    // Add lifestyle-based suggestions
    if (profile.lifestyle) {
      suggestions.push(`${profile.lifestyle.toLowerCase()} outfit`)
    }

    // Add budget-conscious suggestions
    if (profile.budgetRange && profile.budgetRange.length > 0) {
      const hasAffordableBudget = profile.budgetRange.some(range => 
        range.includes('Under $50') || range.includes('$50-$100')
      )
      if (hasAffordableBudget) {
        suggestions.push('affordable fashion')
        suggestions.push('budget clothing')
      }
    }

    return suggestions.slice(0, 6) // Limit to 6 suggestions
  }, [profile])

  return {
    // Profile state
    profileLoaded,
    hasStyles: profile.style && profile.style.length > 0,
    hasGender: profile.gender && profile.gender !== 'Prefer not to say',
    hasMultipleStyles: profile.style && profile.style.length > 1,
    
    // Current rotation state
    currentStyle: getCurrentStyle(),
    currentStyleIndex: rotationState.currentStyleIndex,
    allStyles: profile.style || [],
    
    // Query building functions
    buildEnhancedQuery,
    getDiscoverQuery,
    getSearchSuggestions,
    
    // Manual rotation control
    rotateToNextStyle,
    
    // Utility - only consider configured if they have detailed preferences beyond basic gender
    isProfileConfigured: profileLoaded && (profile.style && profile.style.length > 0)
  }
}
