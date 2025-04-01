import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const GameContext = createContext()

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState({
    isConnected: false,
    currentRoom: null,
    players: [],
    isMyTurn: false
  })

  useEffect(() => {
    const socket = io('http://20.19.81.107:3000')
    
    socket.on('connect', () => {
      setGameState(prev => ({ ...prev, isConnected: true }))
      // Join game automatically (you might want to add a lobby/username screen)
      socket.emit('joinGame', `Player_${socket.id.slice(0, 5)}`)
    })

    socket.on('gameStart', ({ players }) => {
      setGameState(prev => ({
        ...prev,
        players,
        currentRoom: players[0].room,
        isMyTurn: players[0].id === socket.id
      }))
    })

    socket.on('playerShot', ({ playerId, force }) => {
      // Handle other player's shot
      setGameState(prev => ({
        ...prev,
        isMyTurn: playerId !== socket.id
      }))
    })

    setSocket(socket)

    return () => socket.disconnect()
  }, [])

  return (
    <GameContext.Provider value={{ gameState, socket }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => useContext(GameContext)