import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AppLayout } from '@/components/layout/AppLayout'

const PROMPT_CHIPS = [
  "Laat mijn sales pipeline zien",
  "Wat zijn mijn actieve deals?",
  "Welke offertes zijn verstuurd?",
  "Toon bedrijven in mijn portfolio",
  "Welke contacten moet ik bellen?",
  "Wat is mijn omzet deze maand?",
  "Welke leads moet ik opvolgen?",
  "Toon mijn top 5 klanten",
]

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChatPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(scrollToBottom, [messages])
  
  const handleSend = async (text: string) => {
    if (!text.trim()) return
    
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    
    // TODO: Call AI chatbot API
    // Simulate response
    setTimeout(() => {
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: 'Dit is een tijdelijke response. Integratie met AI chatbot komt binnenkort!' 
      }
      setMessages(prev => [...prev, assistantMessage])
    }, 1000)
  }
  
  return (
    <AppLayout title="CRM Assistent">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex-shrink-0 border-b p-4 bg-background">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">CRM Assistent</h1>
              <p className="text-xs text-muted-foreground">Powered by Claude AI</p>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Hoe kan ik helpen?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Stel een vraag of kies een van de suggesties
              </p>
              
              {/* Prompt chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {PROMPT_CHIPS.map((chip) => (
                  <Button
                    key={chip}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(chip)}
                    className="rounded-full"
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    {message.content}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* Input */}
        <div 
          className="flex-shrink-0 border-t p-4 bg-background"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Typ je vraag..."
              className="flex-1 h-12 text-base rounded-full"
            />
            <Button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              size="icon"
              className="h-12 w-12 rounded-full"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
