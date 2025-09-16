"use client"

import { useDirectMessages } from "@/hooks/use-direct-messages"
import { useUser } from "@clerk/nextjs"
import { useEffect } from "react"

export default function DirectMessagesTest() {
  const { user } = useUser()
  const { 
    conversations, 
    currentMessages, 
    loading, 
    loadConversations, 
    startConversation 
  } = useDirectMessages()

  useEffect(() => {
    if (user?.id) {
      console.log('Loading conversations for user:', user.id)
      loadConversations()
    }
  }, [user?.id])

  const handleTestConversation = async () => {
    // Test creating a conversation with a mock user ID
    const conversationId = await startConversation('test-user-id')
    console.log('Created conversation:', conversationId)
  }

  return (
    <div className="p-6 bg-zinc-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Direct Messages Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Current User:</h2>
          <p>{user?.id ? `Logged in as: ${user.id}` : 'Not logged in'}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Conversations ({conversations.length}):</h2>
          {loading ? (
            <p>Loading...</p>
          ) : conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conv: any) => (
                <div key={conv.id} className="p-3 bg-zinc-800 rounded">
                  <p><strong>ID:</strong> {conv.id}</p>
                  <p><strong>Other participant:</strong> {conv.other_participant?.display_name || 'Unknown'}</p>
                  <p><strong>Last message:</strong> {conv.last_message?.content || 'No messages'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No conversations found</p>
          )}
        </div>

        <button
          onClick={handleTestConversation}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          Test Create Conversation
        </button>
      </div>
    </div>
  )
}