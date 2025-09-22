"use client"

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function WebhookTestPage() {
  const { user } = useUser()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualClerkId, setManualClerkId] = useState('')

  const testProfileCreation = async (clerkId: string) => {
    if (!clerkId) return

    setLoading(true)
    try {
      const response = await fetch('/api/webhooks/clerk/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clerkId }),
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const testCurrentUser = () => {
    if (user?.id) {
      testProfileCreation(user.id)
    }
  }

  const testManualUser = () => {
    if (manualClerkId.trim()) {
      testProfileCreation(manualClerkId.trim())
    }
  }

  return (
    <div className="p-6 bg-zinc-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Webhook Profile Creation Test</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Current User:</h2>
          <p>Clerk ID: {user?.id || 'Not logged in'}</p>
          <button
            onClick={testCurrentUser}
            disabled={!user?.id || loading}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white"
          >
            Test Profile Creation for Current User
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Manual Test:</h2>
          <input
            type="text"
            value={manualClerkId}
            onChange={(e) => setManualClerkId(e.target.value)}
            placeholder="Enter Clerk User ID"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white w-full max-w-md"
          />
          <button
            onClick={testManualUser}
            disabled={!manualClerkId.trim() || loading}
            className="mt-2 ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white"
          >
            Test Profile Creation for Manual User
          </button>
        </div>

        {loading && (
          <div className="text-yellow-400">Testing profile creation...</div>
        )}

        {testResult && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Test Result:</h2>
            <pre className="bg-zinc-800 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Use the "Test Profile Creation for Current User" button to create a profile for yourself</li>
            <li>Or enter a new user's Clerk ID in the manual test field to create their profile</li>
            <li>Check the test result to see if the profile was created successfully</li>
            <li>Once profiles exist, direct messaging should work for all users</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
