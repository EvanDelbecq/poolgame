import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const GameContext = createContext()

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState({
    isConnected: false,
    currentRoom: null,
    players: [],
    isMyTurn: false,
    myIndex: null // Add player index tracking
  })

  useEffect(() => {
    // Use explicit configuration options to ensure proper connection
    const socket = io('http://20.19.81.107:3000', {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // pingInterval: 1000,
      // pingTimeout: 3000,
    });
    
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
      setGameState(prev => ({ ...prev, isConnected: true }))
      
      // Delay the join event slightly to ensure connection is stable
      setTimeout(() => {
        const playerName = `Player_${socket.id.slice(0, 5)}`;
        console.log('Emitting joinGame event with name:', playerName);
        socket.emit('joinGame', playerName);
      }, 500);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socket.on('gameStart', ({ players }) => {
      console.log('Game started with players:', players);
      
      // Find the current player in the players array
      const currentPlayerIndex = players.findIndex(player => player.id === socket.id);
      console.log('Current player index:', currentPlayerIndex);
      
      setGameState(prev => ({
        ...prev,
        players,
        currentRoom: players[0].room,
        myIndex: currentPlayerIndex,
        // First player's turn when game starts
        isMyTurn: currentPlayerIndex === 0
      }));
      
      console.log(`Setting initial turn: ${currentPlayerIndex === 0}`);
    })

    socket.on('playerShot', ({ playerId, force }) => {
      console.log('Player shot received:', playerId, force);
      // Set my turn to true when OTHER player has shot
      setGameState(prev => {
        const newIsMyTurn = playerId !== socket.id;
        console.log(`Setting my turn to: ${newIsMyTurn} after shot from ${playerId}`);
        return {
          ...prev,
          isMyTurn: newIsMyTurn
        };
      });
    })

    // Store socket in state for later use
    setSocket(socket)

    return () => {
      console.log('Disconnecting socket');
      socket.disconnect();
    }
  }, [])

  // Function to send a shot
  const sendShot = (force) => {
    if (socket && gameState.isConnected && gameState.isMyTurn) {
      console.log('Sending shot with force:', force);
      socket.emit('shot', { force });
      
      // Update local state immediately to prevent multiple shots
      setGameState(prev => {
        console.log('Setting my turn to false after shooting');
        return {
          ...prev,
          isMyTurn: false
        };
      });
    } else {
      console.log('Cannot shoot: not connected, not your turn, or invalid socket', {
        connected: gameState.isConnected,
        isMyTurn: gameState.isMyTurn,
        socketExists: !!socket
      });
    }
  };

  return (
    <GameContext.Provider value={{ 
      gameState, 
      socket,
      sendShot // Expose the sendShot function
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => useContext(GameContext)