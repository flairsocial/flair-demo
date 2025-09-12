"use client"

import { useState } from "react"

export default function DatabaseDebugPage() {
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)

  const checkSchema = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/database')
      const data = await response.json()
      setOutput(JSON.stringify(data, null, 2))
    } catch (error) {
      setOutput(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const checkConversations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/conversations')
      const data = await response.json()
      setOutput(JSON.stringify(data, null, 2))
    } catch (error) {
      setOutput(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Database Debug</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={checkSchema}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Check Schema
        </button>
        
        <button
          onClick={checkConversations}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Check Conversations
        </button>
      </div>

      <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto">
        {output || "Click a button to run diagnostics"}
      </pre>
    </div>
  )
}
