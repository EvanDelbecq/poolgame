import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import styles from './LobbyUI.module.css';

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

  // If no player has been added yet, show name input
  if (!gameState.myPlayer) {
    return (
      <div className={styles.lobbyContainer}>
        <div className={styles.lobbyCard}>
          <h2>Pool Game</h2>
          {isJoining && <p>Joining existing game...</p>}
          <form onSubmit={handleNameSubmit}>
            <div className={styles.formGroup}>
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
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.button}>
              {isJoining ? 'Join Game' : 'Create Game'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If connected, show waiting room and players
  return (
    <div className={styles.lobbyContainer}>
      <div className={styles.lobbyCard}>
        <h2>Game Lobby</h2>
        
        <div className={styles.playersContainer}>
          <h3>Players</h3>
          <div className={styles.playersList}>
            {gameState.players.map((player, index) => (
              <div key={player.id} className={styles.playerItem}>
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{player.name}</span>
                  {player.id === socket.id && <span className={styles.youTag}>(You)</span>}
                </div>
                <div className={styles.playerStatus}>
                  {player.isReady ? (
                    <span className={styles.readyBadge}>Ready</span>
                  ) : (
                    <span className={styles.notReadyBadge}>Not Ready</span>
                  )}
                </div>
              </div>
            ))}
            
            {gameState.players.length === 1 && (
              <div className={styles.waitingMessage}>
                Waiting for another player to join...
              </div>
            )}
          </div>
        </div>
        
        {gameState.currentRoom && (
          <div className={styles.inviteLinkContainer}>
            <h3>Invite a Friend</h3>
            <div className={styles.inviteLink}>
              <input
                type="text"
                value={inviteLink}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button onClick={copyInviteLink} className={styles.copyButton}>
                {inviteCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
        
        <div className={styles.actions}>
          <button
            onClick={handleToggleReady}
            className={isReady ? styles.notReadyButton : styles.readyButton}
          >
            {isReady ? 'Not Ready' : 'Ready to Play'}
          </button>
        </div>
        
        {gameState.allPlayersReady && gameState.players.length === 2 && (
          <div className={styles.startingMessage}>
            All players ready! Starting game...
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyUI;