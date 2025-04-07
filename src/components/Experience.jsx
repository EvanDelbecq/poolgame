import { OrbitControls, Text, useProgress } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Pooltable from './models/Pooltable'
import PoolBall from './models/PoolBall'
import { Perf } from 'r3f-perf'
import { useGame } from '../context/GameContext'
import { useState, useEffect, useRef } from 'react'

const Experience = () => {
    const { gameState, socket, isPhysicsAuthority, registerBallUpdateCallback } = useGame()
    const [paused, setPaused] = useState(true) // Start with physics paused
    const [allLoaded, setAllLoaded] = useState(false) // Track loading state
    const [tableLoaded, setTableLoaded] = useState(false)
    const ballRefs = useRef({});
    const { progress, loaded } = useProgress()
    const cueBallPosition = useRef([-4, 3.8, 0]) // Store original cue ball position
    const lastSyncTime = useRef(0);
    const lastPhysicsSnapshot = useRef({});
    const physicsOutOfSyncCounter = useRef(0);
    const syncThreshold = 0.5; // Distance threshold for considering physics out of sync (in world units)

    // If we're not in the playing phase, pause physics
    useEffect(() => {
        if (gameState.gamePhase !== 'playing') {
            setPaused(true);
        } else if (allLoaded) {
            setPaused(false);
        }
    }, [gameState.gamePhase, allLoaded]);

    // Function to register ball references
    const registerBall = (ballNumber, ref) => {
        if (ref === null) {
            // Remove the reference if null is passed
            delete ballRefs.current[ballNumber];
        } else {
            ballRefs.current[ballNumber] = ref;
            
            // Register this ball with the game context for physics updates
            registerBallUpdateCallback(ballNumber, (ballData) => {
                if (!ref.current || !ballData) return;
                
                try {
                    // Get current position and velocity
                    const currentPos = ref.current.translation();
                    const currentVel = ref.current.linvel();
                    
                    // Calculate distance between current and incoming position
                    const distanceSquared = 
                        Math.pow(currentPos.x - ballData.position.x, 2) +
                        Math.pow(currentPos.z - ballData.position.z, 2);
                    
                    // Calculate speed
                    const currentSpeed = Math.sqrt(
                        currentVel.x * currentVel.x + 
                        currentVel.z * currentVel.z
                    );
                    
                    const incomingSpeed = Math.sqrt(
                        ballData.velocity.x * ballData.velocity.x + 
                        ballData.velocity.z * ballData.velocity.z
                    );
                    
                    // Get elapsed time since last update (for interpolation)
                    const now = performance.now();
                    const elapsed = now - lastSyncTime.current;
                    lastSyncTime.current = now;
                    
                    // Apply different sync strategies based on conditions
                    
                    // Strategy 1: If ball is nearly stationary, snap to exact position
                    if (incomingSpeed < 0.05) {
                        ref.current.setTranslation({
                            x: ballData.position.x,
                            y: ballData.position.y, 
                            z: ballData.position.z
                        });
                        ref.current.setLinvel({
                            x: 0, y: 0, z: 0
                        });
                        ref.current.setAngvel({
                            x: 0, y: 0, z: 0
                        });
                        return;
                    }
                    
                    // Strategy 2: If distance is large, snap to position but keep momentum
                    if (distanceSquared > syncThreshold * syncThreshold) {
                        // If we detect significant desync, increment counter
                        physicsOutOfSyncCounter.current++;
                        
                        // Hard correction needed
                        ref.current.setTranslation({
                            x: ballData.position.x,
                            y: ballData.position.y, 
                            z: ballData.position.z
                        });
                        
                        // Apply incoming velocity
                        ref.current.setLinvel({
                            x: ballData.velocity.x,
                            y: ballData.velocity.y,
                            z: ballData.velocity.z
                        });
                        
                        // If we've detected desync many times in a row, log warning
                        if (physicsOutOfSyncCounter.current > 10) {
                            console.warn(`Ball ${ballNumber} is consistently out of sync`);
                            physicsOutOfSyncCounter.current = 0;
                        }
                    } 
                    // Strategy 3: Small correction with interpolation
                    else {
                        physicsOutOfSyncCounter.current = 0;
                        
                        // Calculate interpolation factor - how strongly to correct (0.1 to 0.5)
                        // Faster balls need stronger correction
                        const correctionFactor = Math.min(0.1 + (incomingSpeed * 0.1), 0.5);
                        
                        // Smoothly interpolate position
                        const newX = currentPos.x + (ballData.position.x - currentPos.x) * correctionFactor;
                        const newZ = currentPos.z + (ballData.position.z - currentPos.z) * correctionFactor;
                        
                        // Apply interpolated position
                        ref.current.setTranslation({
                            x: newX,
                            y: ballData.position.y, // Y is less important for pool, take direct value
                            z: newZ
                        });
                        
                        // Blend velocities (stronger on velocity than position)
                        const blendFactor = Math.min(0.3 + (incomingSpeed * 0.1), 0.7);
                        
                        ref.current.setLinvel({
                            x: currentVel.x + (ballData.velocity.x - currentVel.x) * blendFactor,
                            y: ballData.velocity.y, // Direct Y velocity
                            z: currentVel.z + (ballData.velocity.z - currentVel.z) * blendFactor
                        });
                    }
                    
                    // Store last snapshot for this ball
                    lastPhysicsSnapshot.current[ballNumber] = ballData;
                    
                } catch (error) {
                    console.error(`Error applying physics update to ball ${ballNumber}:`, error);
                }
            });
        }
    };

    const solidBalls = [1, 2, 3, 4, 5, 6, 7]
    const stripedBalls = [9, 10, 11, 12, 13, 14, 15]
    const cueBall = 0
    const eightBall = 8
    const balls = [eightBall, ...solidBalls, ...stripedBalls]
    const xStep = 0.255
    const zStep = 0.14
    const ballYpos = 3.8
    const ballPositions = {
        0: [-4, ballYpos, 0], // cue ball position
        // First row
        1: [xStep, ballYpos, 0],
        // Second row
        9: [2 * xStep, ballYpos, zStep],
        3: [2 * xStep, ballYpos, -zStep],
        // Third row
        10: [3 * xStep, ballYpos, 2 * zStep],
        8: [3 * xStep, ballYpos, 0],
        11: [3 * xStep, ballYpos, -2 * zStep],
        // Fourth row
        6: [4 * xStep, ballYpos, 3 * zStep],
        14: [4 * xStep, ballYpos, zStep],
        2: [4 * xStep, ballYpos, -zStep],
        4: [4 * xStep, ballYpos, -3 * zStep],
        // Fifth row
        5: [5 * xStep, ballYpos, 4 * zStep],
        12: [5 * xStep, ballYpos, 2 * zStep],
        13: [5 * xStep, ballYpos, 0],
        7: [5 * xStep, ballYpos, -2 * zStep],
        15: [5 * xStep, ballYpos, -4 * zStep],
    }
    
    // Handle table loading callback
    const handleTableLoaded = () => {
        console.log("Pool table loaded completely");
        setTableLoaded(true);
    };
    
    // Track when all models and textures are loaded
    useEffect(() => {
        if (progress === 100 && loaded && tableLoaded) {
            console.log("All assets loaded, starting physics after delay");
            // Add a small delay before starting physics to ensure everything is positioned correctly
            const timer = setTimeout(() => {
                setAllLoaded(true);
                // Only unpause if we're in playing phase
                if (gameState.gamePhase === 'playing') {
                    setPaused(false);
                    console.log("Physics simulation started");
                    
                    // Request full physics state if we're not the authority
                    if (!isPhysicsAuthority && socket) {
                        console.log("Requesting full physics state");
                        socket.emit('requestFullState');
                    }
                } else {
                    console.log("Assets loaded, waiting for game phase to change to playing");
                }
            }, 500); // 500ms delay for safety
            
            return () => clearTimeout(timer);
        }
    }, [progress, loaded, tableLoaded, gameState.gamePhase, isPhysicsAuthority, socket]);

    // Listen for cue ball respawn events
    useEffect(() => {
        if (!socket) return;
        
        const handleCueBallRespawn = () => {
            console.log("Respawning cue ball");
            
            // Remove cue ball from the holes list
            const newBallsInHole = gameState.ballsInHole.filter(ball => ball !== 0);
            
            // Update local state to reflect cue ball is no longer in a hole
            gameState.ballsInHole = newBallsInHole;
            
            // If we have a reference to the cue ball, reset its position and velocity
            setTimeout(() => {
                if (ballRefs.current[0] && ballRefs.current[0].current) {
                    console.log("Setting cue ball position to:", cueBallPosition.current);
                    ballRefs.current[0].current.setTranslation({ 
                        x: cueBallPosition.current[0], 
                        y: cueBallPosition.current[1], 
                        z: cueBallPosition.current[2] 
                    });
                    ballRefs.current[0].current.setLinvel({ x: 0, y: 0, z: 0 });
                    ballRefs.current[0].current.setAngvel({ x: 0, y: 0, z: 0 });
                }
            }, 100);
        };
        
        // Request and handle full game state for accurate synchronization
        const handleFullState = (fullState) => {
            console.log("Received full physics state", fullState);
            
            // Apply the state to all balls with precise positioning
            Object.entries(fullState).forEach(([ballNumber, ballData]) => {
                const ballRef = ballRefs.current[ballNumber];
                if (ballRef && ballRef.current) {
                    // Directly set position and velocity
                    ballRef.current.setTranslation({
                        x: ballData.position.x,
                        y: ballData.position.y,
                        z: ballData.position.z
                    });
                    
                    ballRef.current.setLinvel({
                        x: ballData.velocity.x,
                        y: ballData.velocity.y,
                        z: ballData.velocity.z
                    });
                    
                    // Also store this as the last known good state
                    lastPhysicsSnapshot.current[ballNumber] = ballData;
                }
            });
        };
        
        socket.on('respawnCueBall', handleCueBallRespawn);
        socket.on('fullState', handleFullState);
        
        return () => {
            socket.off('respawnCueBall', handleCueBallRespawn);
            socket.off('fullState', handleFullState);
        };
    }, [socket, gameState]);

    // Send physics snapshots when authority with improved frequency and accuracy
    useEffect(() => {
        if (!socket || !isPhysicsAuthority || paused || gameState.gamePhase !== 'playing') return;

        // Track if any ball is moving at high speed for adaptive sync rate
        const adaptiveRateRef = useRef(100); // Default 100ms between updates
        
        const snapshotInterval = setInterval(() => {
            const snapshot = {};
            let hasMovingBalls = false;
            let maxSpeed = 0;

            try {
                // Safe way to collect positions of all balls
                Object.entries(ballRefs.current).forEach(([ballNumber, ref]) => {
                    // Skip if ref or ref.current is null or if ball is in a hole
                    if (!ref || !ref.current || gameState.ballsInHole?.includes(parseInt(ballNumber, 10))) {
                        return;
                    }
                    
                    try {
                        const pos = ref.current.translation();
                        const vel = ref.current.linvel();
                        const ang = ref.current.angvel(); // Include angular velocity
                        
                        // Calculate speed
                        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
                        maxSpeed = Math.max(maxSpeed, speed);
                        
                        // Round values to reduce network traffic but maintain precision
                        // For slow balls: less precision, fast balls: more precision
                        const precision = speed > 1 ? 1000 : 100;
                        
                        const roundedPos = {
                            x: Math.round(pos.x * precision) / precision,
                            y: Math.round(pos.y * precision) / precision,
                            z: Math.round(pos.z * precision) / precision
                        };
                        
                        const roundedVel = {
                            x: Math.round(vel.x * precision) / precision,
                            y: Math.round(vel.y * precision) / precision,
                            z: Math.round(vel.z * precision) / precision
                        };
                        
                        // Include angular velocity for better physics replication
                        const roundedAng = {
                            x: Math.round(ang.x * 10) / 10,
                            y: Math.round(ang.y * 10) / 10,
                            z: Math.round(ang.z * 10) / 10
                        };
                        
                        snapshot[ballNumber] = {
                            position: roundedPos,
                            velocity: roundedVel,
                            angularVelocity: roundedAng,
                            speed
                        };
                        
                        // Check if this ball is moving enough to send updates
                        if (speed > 0.005) hasMovingBalls = true;
                        
                    } catch (error) {
                        console.log(`Error accessing ball ${ballNumber}:`, error);
                        // Clean up invalid refs
                        ballRefs.current[ballNumber] = null;
                    }
                });

                // Adaptive update rate based on maximum ball speed
                if (maxSpeed > 3) {
                    adaptiveRateRef.current = 40; // Fast updates for fast balls
                } else if (maxSpeed > 1) {
                    adaptiveRateRef.current = 60; // Medium speed
                } else {
                    adaptiveRateRef.current = 100; // Slow updates for slow/stopped balls
                }

                // Only send snapshot if balls are moving or it's a full sync request
                if (hasMovingBalls && Object.keys(snapshot).length > 0) {
                    socket.emit('physicsSnapshot', {
                        snapshot,
                        timestamp: Date.now()
                    });
                }
                
                // Periodically send full state even if balls aren't moving much
                // This helps maintain synchronization
                const now = Date.now();
                if (now - lastSyncTime.current > 2000) { // Every 2 seconds
                    lastSyncTime.current = now;
                    // Only send if we have ball data and we're still the authority
                    if (Object.keys(snapshot).length > 0 && isPhysicsAuthority) {
                        socket.emit('fullState', snapshot);
                    }
                }
                
            } catch (error) {
                console.error("Error in physics sync:", error);
            }
        }, adaptiveRateRef.current); // Will adapt between updates

        return () => clearInterval(snapshotInterval);
    }, [socket, isPhysicsAuthority, gameState.ballsInHole, paused, gameState.gamePhase]);

    // If we're in lobby phase, don't render the full game experience
    if (gameState.gamePhase === 'lobby') {
        return (
            <ambientLight intensity={0.5} />
        );
    }

    return (
        <>
            <ambientLight intensity={1} color={'red'} />
            <OrbitControls target={[0, 4, 0]} makeDefault />
            <spotLight position={[0, 15, 0]} angle={0.55} intensity={500} penumbra={0.2} castShadow />

            {/* Loading indicator */}
            {!allLoaded && (
                <Text position={[0, 6, 0]} fontSize={0.5} color="white">
                    Loading... ({Math.round(progress)}%)
                </Text>
            )}

            {/* Game information UI */}
            <Text position={[-6, 8, 0]} fontSize={0.5} color="white">
                {`${gameState.players[0]?.name || 'Player 1'}: ${gameState.scores?.[0] || 0} points`}
                {gameState.playerTypes?.[0] ? ` (${gameState.playerTypes[0]})` : ''}
            </Text>

            <Text position={[6, 8, 0]} fontSize={0.5} color="white">
                {`${gameState.players[1]?.name || 'Player 2'}: ${gameState.scores?.[1] || 0} points`}
                {gameState.playerTypes?.[1] ? ` (${gameState.playerTypes[1]})` : ''}
            </Text>

            {gameState.isMyTurn && (
                <Text position={[0, 7, 0]} fontSize={0.7} color="yellow">
                    Your Turn
                </Text>
            )}

            {isPhysicsAuthority && (
                <Text position={[0, 6, 0]} fontSize={0.5} color="green">
                    Physics Authority
                </Text>
            )}

            {gameState.gameWinner !== null && (
                <Text position={[0, 9, 0]} fontSize={1} color="gold">
                    {gameState.gameWinner === gameState.myIndex ? 'You Won!' : 'You Lost!'}
                </Text>
            )}

            <Physics 
                debug={false}
                gravity={[0, -9.81, 0]} 
                paused={paused}
                timeStep={1/120}
                interpolation={true}
                maxStabilizationIterations={10}
                allowSleep={true}
            >
                {/* Always render the table first */}
                <Pooltable position={[0, 0, 0]} onLoaded={handleTableLoaded} />
                
                {/* Only render balls after everything is loaded */}
                {allLoaded && (
                    <>
                        {!gameState.ballsInHole?.includes(cueBall) && 
                            <PoolBall 
                                position={ballPositions[cueBall]} 
                                ballNumber={cueBall} 
                                registerRef={registerBall}
                            />
                        }
                        
                        {balls.map(ball => (
                            !gameState.ballsInHole?.includes(ball) && 
                            <PoolBall 
                                key={ball} 
                                position={ballPositions[ball]} 
                                ballNumber={ball} 
                                registerRef={registerBall}
                            />
                        ))}
                    </>
                )}
            </Physics>
        </>
    );
};

export default Experience;
