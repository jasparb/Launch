import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { Connection, clusterApiUrl } from '@solana/web3.js'
import { getPriceIndexer } from '../../../lib/priceIndexer'

// Extend NextApiResponse to include socket
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: any
}

const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed')
const priceIndexer = getPriceIndexer(connection)

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...')
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/websocket/price',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    // Store active subscriptions
    const subscriptions = new Map<string, Set<string>>() // tokenAddress -> Set of socketIds

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Handle subscription to token price updates
      socket.on('subscribe', async (data: { tokenAddress: string }) => {
        const { tokenAddress } = data
        
        if (!tokenAddress) {
          socket.emit('error', { message: 'Token address is required' })
          return
        }

        console.log(`Client ${socket.id} subscribing to ${tokenAddress}`)

        // Add to subscriptions
        if (!subscriptions.has(tokenAddress)) {
          subscriptions.set(tokenAddress, new Set())
          
          // Start monitoring this token if this is the first subscription
          try {
            await priceIndexer.subscribeToCampaign(tokenAddress)
            
            // Add price listener for this token
            priceIndexer.addPriceListener(tokenAddress, (pricePoint) => {
              // Broadcast to all subscribers of this token
              const subscribers = subscriptions.get(tokenAddress)
              if (subscribers) {
                subscribers.forEach(socketId => {
                  io.to(socketId).emit('priceUpdate', {
                    tokenAddress,
                    price: pricePoint.price,
                    volume: pricePoint.volume,
                    marketCap: pricePoint.marketCap,
                    timestamp: pricePoint.timestamp,
                    reserves: {
                      sol: pricePoint.solReserves,
                      token: pricePoint.tokenReserves
                    }
                  })
                })
              }
            })
          } catch (error) {
            console.error(`Failed to subscribe to ${tokenAddress}:`, error)
            socket.emit('error', { message: 'Failed to subscribe to token updates' })
            return
          }
        }

        subscriptions.get(tokenAddress)!.add(socket.id)
        
        // Send current price data
        const currentMetrics = priceIndexer.getCurrentMetrics(tokenAddress)
        if (currentMetrics) {
          socket.emit('priceUpdate', {
            tokenAddress,
            ...currentMetrics,
            timestamp: Date.now()
          })
        } else {
          // Send mock data for testing
          socket.emit('priceUpdate', {
            tokenAddress,
            price: 0.0001 + Math.random() * 0.0001,
            volume: Math.random() * 1000,
            marketCap: 100000 + Math.random() * 50000,
            change24h: (Math.random() - 0.5) * 10,
            timestamp: Date.now()
          })
        }

        socket.emit('subscribed', { tokenAddress })
      })

      // Handle unsubscription
      socket.on('unsubscribe', async (data: { tokenAddress: string }) => {
        const { tokenAddress } = data
        
        console.log(`Client ${socket.id} unsubscribing from ${tokenAddress}`)

        const subscribers = subscriptions.get(tokenAddress)
        if (subscribers) {
          subscribers.delete(socket.id)
          
          // If no more subscribers, stop monitoring
          if (subscribers.size === 0) {
            subscriptions.delete(tokenAddress)
            try {
              await priceIndexer.unsubscribeFromCampaign(tokenAddress)
            } catch (error) {
              console.error(`Failed to unsubscribe from ${tokenAddress}:`, error)
            }
          }
        }

        socket.emit('unsubscribed', { tokenAddress })
      })

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id)

        // Remove from all subscriptions
        for (const [tokenAddress, subscribers] of Array.from(subscriptions.entries())) {
          subscribers.delete(socket.id)
          
          // If no more subscribers, stop monitoring
          if (subscribers.size === 0) {
            subscriptions.delete(tokenAddress)
            try {
              await priceIndexer.unsubscribeFromCampaign(tokenAddress)
            } catch (error) {
              console.error(`Failed to unsubscribe from ${tokenAddress}:`, error)
            }
          }
        }
      })

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        socket.emit('heartbeat', { timestamp: Date.now() })
      }, 30000)

      socket.on('disconnect', () => {
        clearInterval(heartbeat)
      })
    })

    // Store the io instance
    res.socket.server.io = io
    
    // Generate mock price updates for testing
    setInterval(() => {
      for (const [tokenAddress, subscribers] of Array.from(subscriptions.entries())) {
        if (subscribers.size > 0) {
          const mockUpdate = {
            tokenAddress,
            price: 0.0001 + Math.random() * 0.0001,
            volume: Math.random() * 1000,
            marketCap: 100000 + Math.random() * 50000,
            change24h: (Math.random() - 0.5) * 10,
            timestamp: Date.now()
          }
          
          subscribers.forEach(socketId => {
            io.to(socketId).emit('priceUpdate', mockUpdate)
          })
        }
      }
    }, 5000) // Update every 5 seconds for testing
  }

  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}