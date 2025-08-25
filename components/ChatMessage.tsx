import { formatDistanceToNow } from "date-fns"
import { Sparkles, User } from "lucide-react" // Added User icon
import type { Product } from "@/lib/types" // Ensure Product includes 'link'

// Update Message interface to potentially include products
interface MessageWithProducts {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: string
  products?: Product[] // Optional array of products
}

interface ChatMessageProps {
  message: MessageWithProducts // Use the updated interface
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAi = message.sender === "ai"
  const formattedTime = formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })

  return (
    <div className={`flex gap-2.5 ${isAi ? "justify-start" : "justify-end"}`}>
      {isAi && (
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center self-start shrink-0">
          <Sparkles className="w-5 h-5 text-black" strokeWidth={2} />
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 ${isAi ? "bg-zinc-800 text-white" : "bg-white text-black"}`}
      >
        {/* Render message content as paragraphs for better readability */}
        {message.content.split("\n").map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed mb-1 last:mb-0">
            {paragraph}
          </p>
        ))}
        <p className={`text-xs mt-2 ${isAi ? "text-zinc-400" : "text-zinc-500"}`}>{formattedTime}</p>
      </div>
      {!isAi && (
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center self-start shrink-0">
          <User className="w-5 h-5 text-zinc-300" strokeWidth={2} />
        </div>
      )}
    </div>
  )
}
