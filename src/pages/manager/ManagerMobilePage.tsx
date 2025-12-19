import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { LeaveRequestCard } from '@/components/leave/LeaveRequestCard'
import { motion, AnimatePresence } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'

export default function ManagerMobilePage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['pending-leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employee:profiles(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
  })
  
  const currentRequest = pendingRequests?.[currentIndex]
  
  const handleSwipe = () => {
    // Move to next card after swipe
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
    }, 300)
  }
  
  if (isLoading) {
    return (
      <AppLayout title="Goedkeuringen">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Laden...</div>
        </div>
      </AppLayout>
    )
  }
  
  if (!currentRequest) {
    return (
      <AppLayout title="Goedkeuringen">
        <div className="flex items-center justify-center h-screen p-6 text-center">
          <div>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Alles afgehandeld!</h2>
            <p className="text-muted-foreground">Geen verlofaanvragen meer om te beoordelen</p>
          </div>
        </div>
      </AppLayout>
    )
  }
  
  return (
    <AppLayout title="Goedkeuringen">
      <div className="h-screen flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {pendingRequests.length - currentIndex} van {pendingRequests.length}
          </p>
        </div>
        
        {/* Swipeable Cards Stack */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-md">
            <AnimatePresence>
              {pendingRequests.slice(currentIndex, currentIndex + 3).map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ scale: 0.95, y: index * 10, opacity: index === 0 ? 1 : 0.5 }}
                  animate={{ 
                    scale: 1 - index * 0.05, 
                    y: index * 10,
                    opacity: index === 0 ? 1 : 0.5,
                    zIndex: 10 - index
                  }}
                  exit={{ x: -1000, opacity: 0 }}
                  style={{ 
                    position: index === 0 ? 'relative' : 'absolute',
                    width: '100%',
                    top: 0,
                  }}
                  className="w-full"
                >
                  {index === 0 ? (
                    <LeaveRequestCard 
                      request={request}
                      onSwipe={handleSwipe}
                    />
                  ) : (
                    <div className="pointer-events-none">
                      <LeaveRequestCard 
                        request={request}
                        onSwipe={() => {}}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground mt-6 space-y-1">
          <p className="flex items-center justify-center gap-2">
            <span className="text-green-500">→</span>
            Swipe rechts om goed te keuren
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="text-red-500">←</span>
            Swipe links om af te wijzen
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
