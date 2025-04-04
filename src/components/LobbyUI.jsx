import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const LobbyUI = ({ onStartGame }) => {
  const { gameState, socket } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gameState.currentRoom && socket) {
      // Create invite link with room ID
      const url = new URL(window.location.href);
      url.searchParams.set('room', gameState.currentRoom);
      setInviteLink(url.toString());
    }
  }, [gameState.currentRoom, socket]);

  useEffect(() => {
    // Check URL params for room ID on component mount
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    
    if (roomId && socket) {
      console.log('Found room ID in URL:', roomId);
      // We'll join this room instead of creating a new one
      setIsJoining(true);
    }
  }, [socket]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    if (playerName.length > 15) {
      setError('Name must be 15 characters or less');
      return;
    }

    setError('');
    
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');

    if (roomId) {
      // Join specific room from invite link
      socket.emit('joinGame', { playerName: playerName.trim(), roomId });
    } else {
      // Create or join any available room
      socket.emit('joinGame', { playerName: playerName.trim() });
    }
  };

  const handleToggleReady = () => {
    setIsReady(!isReady);
    socket.emit('playerReady', { isReady: !isReady });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // If we're not connected yet or there's a connection error
  if (!gameState.isConnected) {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h2>Connecting to server...</h2>
          {gameState.connectionError && (
            <p className="error">{gameState.connectionError}</p>
          )}
        </div>
      </div>
    );
  }

  // If no player has been added yet, show name input
  if (!gameState.myPlayer) {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h2>Pool Game</h2>
          {isJoining && <p className="joining-text">Joining existing game...</p>}
          <form onSubmit={handleNameSubmit}>
            <div className="form-group">
              <label htmlFor="playerName">Your Name</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={15}
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="submit-button">
              {isJoining ? 'Join Game' : 'Create Game'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If connected, show waiting room and players
  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h2>Game Lobby</h2>
        
        <div className="players-container">
          <h3>Players</h3>
          <div className="players-list">
            {gameState.players.map((player, index) => (
              <div key={player.id} className="player-item">
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  {player.id === socket.id && <span className="you-tag">(You)</span>}
                </div>
                <div className="player-status">
                  {player.isReady ? (
                    <span className="ready-badge">Ready</span>
                  ) : (
                    <span className="not-ready-badge">Not Ready</span>
                  )}
                </div>
              </div>
            ))}
            
            {gameState.players.length === 1 && (
              <div className="waiting-message">
                Waiting for another player to join...
              </div>
            )}
          </div>
        </div>
        
        {gameState.currentRoom && (
          <div className="invite-link-container">
            <h3>Invite a Friend</h3>
            <div className="invite-link">
              <input
                type="text"
                value={inviteLink}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button onClick={copyInviteLink} className="copy-button">
                {inviteCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
        
        <div className="actions">
          <button
            onClick={handleToggleReady}
            className={isReady ? "not-ready-button" : "ready-button"}
          >
            {isReady ? 'Not Ready' : 'Ready to Play'}
          </button>
        </div>
        
        {gameState.allPlayersReady && gameState.players.length === 2 && (
          <div className="starting-message">
            All players ready! Starting game...
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyUI;