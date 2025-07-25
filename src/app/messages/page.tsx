'use client'
import { useState, useEffect, useRef } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Send, Loader2, MessageSquare, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm the WastiFY assistant. How can I help you with waste management today?" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [apiKeyPresent, setApiKeyPresent] = useState(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY
    setApiKeyPresent(!!key)
    if (!key) {
      setError('API Key for the AI assistant is missing. Please configure it.')
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !apiKeyPresent) return

    setIsLoading(true)
    setError('')

    const newMessage: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, newMessage])
    setInput('')

    try {
      const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!
      const genAI = new GoogleGenerativeAI(API_KEY)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      
      // Prepare history for the API
      // 1. Get all messages *except* the current user message we just added
      const historyMessages = messages.slice(0, -1); 

      // 2. Map to the required format
      let apiHistory = historyMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // 3. Ensure the history starts with a 'user' message if it's not empty
      if (apiHistory.length > 0 && apiHistory[0].role !== 'user') {
        // Remove the initial assistant greeting if it's the first message
        apiHistory = apiHistory.slice(1);
      }

      // 4. Ensure the history ends with a 'model' message if not empty
      // The API expects the turn *before* the current user message
      if (apiHistory.length > 0 && apiHistory[apiHistory.length - 1].role === 'user') {
        apiHistory.pop(); 
      }

      // 5. Simple validation for alternating roles (optional but helpful for debugging)
      const validatedHistory = [];
      let expectedRole = 'user';
      for (const msg of apiHistory) {
        if (validatedHistory.length === 0 && msg.role === 'user') {
          validatedHistory.push(msg);
          expectedRole = 'model';
        } else if (validatedHistory.length > 0 && msg.role === expectedRole) {
          validatedHistory.push(msg);
          expectedRole = (expectedRole === 'user' ? 'model' : 'user');
        } else {
           console.warn('Skipping non-alternating message in history:', msg);
           // If roles get out of sync, we might need more robust logic,
           // but for now, we just skip to maintain alternation.
           // Reset expected role based on the last valid message
           if (validatedHistory.length > 0) {
              expectedRole = (validatedHistory[validatedHistory.length - 1].role === 'user' ? 'model' : 'user');
           }
        }
      }
      
      // Limit history length (e.g., last 5 turns = 10 messages)
      const maxHistoryTurns = 5;
      const finalApiHistory = validatedHistory.slice(-maxHistoryTurns * 2);

      console.log("Final API History:", JSON.stringify(finalApiHistory, null, 2));

      const chat = model.startChat({
        history: finalApiHistory, // Use the cleaned and validated history
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(newMessage.content);
      const responseText = result.response.text();

      const assistantMessage: Message = { role: 'assistant', content: responseText }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? `Error: ${err.message}` : 'An unknown error occurred while contacting the AI.')
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-var(--header-height,70px)-var(--footer-height,66px))]">
      {/* Header section */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0A0F1C]/80 backdrop-blur-md rounded-t-xl">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-white">WastiFY Help Bot</h1>
      </div>

      {/* Chat container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 chat-container">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-xl shadow-md ${
              msg.role === 'user' 
                ? 'bg-secondary text-white rounded-br-none' 
                : 'bg-white/5 text-white/90 rounded-bl-none'
            }`}>
              <ReactMarkdown 
                className="prose prose-sm prose-invert max-w-none"
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] px-4 py-3 rounded-xl shadow-md bg-white/5 text-white/90 rounded-bl-none flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[#0A0F1C]/80 backdrop-blur-md border-t border-white/10 rounded-b-xl">
        {error && (
          <div className="flex items-center p-2 mb-3 rounded-lg bg-destructive/20 text-destructive-foreground border border-destructive/50">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={apiKeyPresent ? "Ask about waste management..." : "API Key missing..."}
            className="flex-grow bg-white/5 border-white/10 rounded-full text-white placeholder-white/50 focus:ring-primary/50 focus:ring-offset-0"
            disabled={isLoading || !apiKeyPresent}
            aria-label="Chat input"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary hover:bg-primary/90 text-white rounded-full disabled:opacity-50 flex-shrink-0"
            disabled={isLoading || !input.trim() || !apiKeyPresent}
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}