"use client"

import { RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import SearchBar from "@/components/SearchBar"
import CategoryFilter from "@/components/CategoryFilter"

interface SearchAndCategoriesProps {
  searchQuery: string
  selectedCategory: string
  loading: boolean
  isRefreshing: boolean
  onSearch: (query: string) => void
  onCategoryChange: (category: string) => void
  onRefresh: () => void
}

export default function SearchAndCategories({
  searchQuery,
  selectedCategory,
  loading,
  isRefreshing,
  onSearch,
  onCategoryChange,
  onRefresh
}: SearchAndCategoriesProps) {
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Check if we've scrolled past the header (64px is typical header height)
      const scrolled = window.scrollY > 64
      setIsSticky(scrolled)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div 
      className={`
        ${isSticky 
          ? 'fixed top-0 left-0 right-0 md:left-16 z-50' // Fixed to top when scrolled, account for sidebar
          : 'sticky top-0 z-20' // Normal sticky behavior when at top
        } 
        bg-black pt-0 pb-2 px-3 sm:px-4 border-b border-zinc-900 transition-all duration-200
      `}
    >
      <div className="py-3 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar onSearch={onSearch} />
        </div>
        <button
          onClick={onRefresh}
          disabled={loading || isRefreshing}
          className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh products"
        >
          <RefreshCw 
            className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} 
            strokeWidth={1.5} 
          />
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-hide px-1">
        <CategoryFilter activeCategory={selectedCategory} onCategoryChange={onCategoryChange} />
      </div>
    </div>
  )
}