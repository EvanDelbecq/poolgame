import './App.css'
import { Canvas } from '@react-three/fiber'
import Experience from './components/Experience'
import LobbyUI from './components/LobbyUI.jsx'
import { GameProvider, useGame } from './context/GameContext'
import { Suspense } from 'react'

function GameContent() {
  const { gameState, resetGame } = useGame();
  
  return (
    <>
      <Canvas style={{background: 'black'}} camera={{position:[0,10,7]}} shadows>
        <Suspense fallback={null}>
          <Experience/>
        </Suspense>
      </Canvas>
      
      {/* Show lobby UI when in lobby phase */}
      {gameState.gamePhase === 'lobby' && <LobbyUI />}
      
      {/* Connection error message */}
      {gameState.connectionError && (
        <div className="errorOverlay">
          <div className="errorCard">
            <h2>Connection Error</h2>
            <p>{gameState.connectionError}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}
      
      {/* Show game over UI with rematch option */}
      {gameState.gamePhase === 'gameOver' && (
        <div className="gameOverOverlay">
          <div className="gameOverCard">
            <h2>{gameState.gameWinner === gameState.myIndex ? 'You Won!' : 'You Lost!'}</h2>
            <p>Final Score</p>
            <div className="finalScores">
              <div>
                <span>{gameState.players[0]?.name || 'Player 1'}</span>
                <strong>{gameState.scores[0]}</strong>
              </div>
              <div>
                <span>{gameState.players[1]?.name || 'Player 2'}</span>
                <strong>{gameState.scores[1]}</strong>
              </div>
            </div>
            <button onClick={resetGame}>Play Again</button>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  )
}

export default App
