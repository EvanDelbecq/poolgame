import { OrbitControls, Text, useProgress } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Pooltable from './models/Pooltable'
import PoolBall from './models/PoolBall'
import { Perf } from 'r3f-perf'
import { useGame } from '../context/GameContext'
import { useState, useEffect, useRef } from 'react'

const Experience = () => {
    const { gameState, socket, isPhysicsAuthority } = useGame()
    const [paused, setPaused] = useState(true) // Start with physics paused
    const [allLoaded, setAllLoaded] = useState(false) // Track loading state
    const [tableLoaded, setTableLoaded] = useState(false)
    const ballRefs = useRef({});
    const { progress, loaded } = useProgress()
    const cueBallPosition = useRef([-4, 3.8, 0]) // Store original cue ball position

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
                } else {
                    console.log("Assets loaded, waiting for game phase to change to playing");
                }
            }, 500); // 500ms delay for safety
            
            return () => clearTimeout(timer);
        }
    }, [progress, loaded, tableLoaded, gameState.gamePhase]);

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
        
        socket.on('respawnCueBall', handleCueBallRespawn);
        
        return () => {
            socket.off('respawnCueBall', handleCueBallRespawn);
        };
    }, [socket, gameState]);

    // Send physics snapshots when authority
    useEffect(() => {
        if (!socket || !isPhysicsAuthority || paused || gameState.gamePhase !== 'playing') return;

        const snapshotInterval = setInterval(() => {
            const snapshot = {};
            let hasMovingBalls = false;

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
                        
                        // Only include balls that are actually moving
                        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
                        
                        // Round values to reduce network traffic
                        const roundedPos = {
                            x: Math.round(pos.x * 100) / 100,
                            y: Math.round(pos.y * 100) / 100,
                            z: Math.round(pos.z * 100) / 100
                        };
                        
                        const roundedVel = {
                            x: Math.round(vel.x * 100) / 100,
                            y: Math.round(vel.y * 100) / 100,
                            z: Math.round(vel.z * 100) / 100
                        };
                        
                        snapshot[ballNumber] = {
                            position: roundedPos,
                            velocity: roundedVel
                        };
                        
                        if (speed > 0.01) hasMovingBalls = true;
                    } catch (error) {
                        console.log(`Error accessing ball ${ballNumber}:`, error);
                        // Clean up invalid refs
                        ballRefs.current[ballNumber] = null;
                    }
                });

                // Only send snapshot if balls are moving
                if (hasMovingBalls && Object.keys(snapshot).length > 0) {
                    socket.emit('physicsSnapshot', snapshot);
                }
            } catch (error) {
                console.error("Error in physics sync:", error);
            }
        }, 100);

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
