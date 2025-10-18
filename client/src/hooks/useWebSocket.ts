import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQuery } from '@tanstack/react-query'

interface CallNotification {
  callId: string
  phone: string
  owner?: {
    id: string
    name: string
    phone: string
    email?: string
  }
  patients?: Array<{
    id: string
    name: string
    species: string
  }>
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [incomingCall, setIncomingCall] = useState<CallNotification | null>(null)

  // Get current user
  const { data: authData } = useQuery<{ user: { id: string } }>({
    queryKey: ['/api/auth/me'],
  })

  useEffect(() => {
    const userId = authData?.user?.id
    if (!userId) return

    // Initialize socket connection
    const socket = io({
      path: '/ws/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true, // Important: send cookies with request
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected')
      setIsConnected(true)
      
      // Rooms are auto-managed on server based on authenticated user
      // No need to manually join rooms
    })

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected')
      setIsConnected(false)
    })

    socket.on('incoming_call', (data: CallNotification) => {
      console.log('📞 Incoming call notification:', data)
      setIncomingCall(data)
    })

    return () => {
      socket.disconnect()
    }
  }, [authData?.user?.id])

  const clearIncomingCall = () => {
    setIncomingCall(null)
  }

  return {
    isConnected,
    incomingCall,
    clearIncomingCall,
  }
}
