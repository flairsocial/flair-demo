"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"

interface SearchBarProps {
  onSearch: (query: string) => void
  initialValue?: string
}

export default function SearchBar({ onSearch, initialValue = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)

  // Sync with parent state changes
  useEffect(() => {
    setQuery(initialValue)
  }, [initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const clearSearch = () => {
    setQuery("")
    onSearch("") // This will trigger the useEffect in the parent to fetch random products
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center rounded-full overflow-hidden transition-all duration-300 ${
        isFocused ? "bg-zinc-800 ring-1 ring-white/20" : "bg-zinc-900"
      }`}
    >
      <Search className="w-4 h-4 text-zinc-400 ml-3" strokeWidth={2} />
      <input
        type="text"
        placeholder="Search for items..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full py-2.5 px-2 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm"
      />
      {query && (
        <button type="button" onClick={clearSearch} className="p-2 text-zinc-400" aria-label="Clear search">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
    </form>
  )
}
