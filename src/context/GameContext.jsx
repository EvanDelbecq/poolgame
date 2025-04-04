import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

const GameContext = createContext()

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState({
    isConnected: false,
    currentRoom: null,
    players: [],
    myPlayer: null,
    isMyTurn: false,
    myIndex: null,
    scores: [0, 0],
    playerTypes: [null, null],
    ballsInHole: [],
    gameWinner: null,
    gamePhase: 'lobby', // 'lobby', 'playing', 'gameOver'
    allPlayersReady: false
  })
  const [isPhysicsAuthority, setIsPhysicsAuthority] = useState(false);
  
  // Create a ref to store callbacks for ball position updates
  const ballUpdateCallbacksRef = useRef({});
  
  // Function to register a ball update callback
  const registerBallUpdateCallback = (ballNumber, callback) => {
    if (callback === null) {
      delete ballUpdateCallbacksRef.current[ballNumber];
    } else {
      ballUpdateCallbacksRef.current[ballNumber] = callback;
    }
  };
  
  // Function that will be used to update ball positions from snapshots
  const updateBallPositions = (snapshot) => {
    // Apply the snapshot to all registered balls
    Object.entries(snapshot).forEach(([ballNumber, ballData]) => {
      const callback = ballUpdateCallbacksRef.current[ballNumber];
      if (callback && typeof callback === 'function') {
        try {
          callback(ballData);
        } catch (error) {
          console.error(`Error updating ball ${ballNumber}:`, error);
          delete ballUpdateCallbacksRef.current[ballNumber];
        }
      }
    });
  };

  useEffect(() => {
    // Use explicit configuration options to ensure proper connection
    const socket = io('https://scolavinci.fr', {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
      setGameState(prev => ({ ...prev, isConnected: true }))
      
      // Don't automatically join, wait for the name input
      // Lobby handles joining now
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      // Show error in UI
      setGameState(prev => ({ 
        ...prev, 
        connectionError: `Failed to connect: ${error.message}` 
      }));
    });

    // Update for lobby system
    socket.on('roomJoined', ({ room, players }) => {
      console.log('Room joined:', room, 'Players:', players);
      
      // Find myself in players list
      const myPlayer = players.find(p => p.id === socket.id);
      
      setGameState(prev => ({
        ...prev,
        currentRoom: room,
        players,
        myPlayer
      }));
    });

    socket.on('playerJoined', ({ players }) => {
      console.log('Player joined, updated players:', players);
      setGameState(prev => ({
        ...prev,
        players
      }));
    });

    socket.on('playerLeft', ({ players }) => {
      console.log('Player left, updated players:', players);
      setGameState(prev => ({
        ...prev,
        players
      }));
    });

    socket.on('playerReadyUpdate', ({ players, allReady }) => {
      console.log('Player ready status updated:', players);
      setGameState(prev => ({
        ...prev,
        players,
        allPlayersReady: allReady
      }));
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
        isMyTurn: currentPlayerIndex === 0,
        gamePhase: 'playing'
      }));
      
      console.log(`Setting initial turn: ${currentPlayerIndex === 0}`);
      
      // If it's my turn, I'm the physics authority
      setIsPhysicsAuthority(currentPlayerIndex === 0);
    });

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
      
      // If it's now my turn, I become physics authority
      if (playerId !== socket.id) {
        setIsPhysicsAuthority(true);
      } else {
        setIsPhysicsAuthority(false);
      }
    });
    
    // Handle score updates
    socket.on('scoreUpdate', ({ scores, playerTypes, ballsInHole }) => {
      console.log('Score update received:', scores, playerTypes, ballsInHole);
      setGameState(prev => ({
        ...prev,
        scores,
        playerTypes,
        ballsInHole
      }));
    });
    
    // Handle game over
    socket.on('gameOver', ({ winner, finalScores }) => {
      console.log('Game over! Winner:', winner, 'Final scores:', finalScores);
      setGameState(prev => ({
        ...prev,
        gameWinner: winner,
        scores: finalScores,
        isMyTurn: false,
        gamePhase: 'gameOver'
      }));
    });

    // Add new event for physics update
    socket.on('physicsSnapshot', (snapshot) => {
      if (!isPhysicsAuthority) {
        try {
          // Apply the snapshot to all balls
          updateBallPositions(snapshot);
        } catch (error) {
          console.error("Error applying physics snapshot:", error);
        }
      }
    });

    // Add new event for ball in hole
    socket.on('ballInHole', ({ ballNumber, ballsInHole }) => {
      console.log(`Ball ${ballNumber} is now in a hole`);
      setGameState(prev => ({
        ...prev,
        ballsInHole
      }));
      
      // If this is the cue ball, wait for the respawn event
      if (ballNumber === 0) {
        console.log("Cue ball fell in a hole, waiting for respawn");
      }
    });

    // Add new event for cue ball respawn
    socket.on('respawnCueBall', () => {
      console.log("Respawning cue ball");
      
      // Update state to remove cue ball from holes list
      setGameState(prev => ({
        ...prev,
        ballsInHole: prev.ballsInHole.filter(ball => ball !== 0)
      }));
    });

    // Store socket in state for later use
    setSocket(socket);

    return () => {
      console.log('Disconnecting socket');
      socket.disconnect();
    }
  }, []);

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

  // Function to reset game for rematch
  const resetGame = () => {
    if (socket && gameState.gamePhase === 'gameOver') {
      socket.emit('requestRematch');
      setGameState(prev => ({
        ...prev,
        gamePhase: 'lobby',
        gameWinner: null,
        scores: [0, 0],
        playerTypes: [null, null],
        ballsInHole: []
      }));
    }
  };

  return (
    <GameContext.Provider value={{ 
      gameState, 
      socket,
      sendShot,
      isPhysicsAuthority,
      registerBallUpdateCallback,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => useContext(GameContext)