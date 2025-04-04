import { useLoader, useThree } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"
import ShootIndicator from "./ShootIndicator"
import { BallCollider, RigidBody, vec3 } from "@react-three/rapier"
import { useGame } from '../../context/GameContext'

const PoolBall = ({position, ballNumber, registerRef, props}) => {
    const ref = useRef(null)
    const texture = useLoader(THREE.TextureLoader, `/textures/Ball${ballNumber}.jpg`)
    const pointer = useThree((state) => state.pointer)
    const controls = useThree((state) => state.controls)
    const camera = useThree((state) => state.camera)
    const [isShooting, setIsShooting] = useState(false)
    const [force, setForce] = useState(new THREE.Vector3(0,0,0))
    const hasReportedHole = useRef(false);
    const isInHole = useRef(false);
    const { gameState, sendShot, socket, isPhysicsAuthority, registerBallUpdateCallback } = useGame()

    // Register this ball's ref for physics sync
    useEffect(() => {
        if (registerRef && ref.current) {
            registerRef(ballNumber, ref);
            
            // Cleanup function to unregister when component unmounts
            return () => {
                registerRef(ballNumber, null);
            };
        }
    }, [ballNumber, registerRef, ref]);

    // Register the ball update callback for physics snapshots
    useEffect(() => {
        if (!isPhysicsAuthority) {
            registerBallUpdateCallback(ballNumber, (ballData) => {
                if (ref.current && !isInHole.current) {
                    // Only update if ball is not in a hole
                    const currentPos = ref.current.translation();
                    const targetPos = ballData.position;
                    
                    // Ignore y-axis difference for comparison
                    const distance = Math.sqrt(
                        Math.pow(currentPos.x - targetPos.x, 2) + 
                        Math.pow(currentPos.z - targetPos.z, 2)
                    );
                    
                    if (distance > 0.05) {
                        ref.current.setTranslation(ballData.position);
                        ref.current.setLinvel(ballData.velocity);
                    }
                }
            });
            
            // Return cleanup function
            return () => {
                registerBallUpdateCallback(ballNumber, null);
            };
        }
    }, [ballNumber, isPhysicsAuthority, registerBallUpdateCallback]);
    
    const handleClick = (e) => {
        if (ballNumber !== 0 || isShooting || !gameState.isMyTurn || isInHole.current) return;
        e.stopPropagation();
        controls.target.set(ref.current.translation().x, 4, ref.current.translation().z);
        camera.position.set(ref.current.translation().x, 15, ref.current.translation().z);
        setIsShooting(true);
    };
    
    const normalizePointer = (pointer) => {
        // More consistent force calculation
        const maxForce = 15;
        const range = [-maxForce, maxForce];
        const normalizedX = THREE.MathUtils.clamp(pointer.x * maxForce, range[0], range[1]);
        const normalizedY = THREE.MathUtils.clamp(pointer.y * maxForce, range[0], range[1]);
        
        // Round values to reduce jitter
        return new THREE.Vector3(
            Math.round(normalizedX * 100) / 100, 
            0, 
            Math.round(normalizedY * 100) / 100
        );
    };

    // Check position in a safe interval instead of in collision handlers
    useEffect(() => {
        // Skip if already reported or not in play
        if (hasReportedHole.current || isInHole.current || !ref.current) return;
        
        // Use an interval to check if ball fell into a hole
        const checkInterval = setInterval(() => {
            if (!ref.current) return;
            
            const ballPosition = ref.current.translation();
            // Check if ball is below the table level
            if (ballPosition.y < 3.5) {
                clearInterval(checkInterval);
                isInHole.current = true;
                hasReportedHole.current = true;
                
                // Emit ball position event to server safely
                setTimeout(() => {
                    socket.emit('ballPosition', { 
                        ballNumber,
                        position: { 
                            x: Math.round(ballPosition.x * 100) / 100,
                            y: Math.round(ballPosition.y * 100) / 100, 
                            z: Math.round(ballPosition.z * 100) / 100 
                        }
                    });
                    console.log(`Ball ${ballNumber} reported in hole`);
                }, 0);
            }
        }, 100); // Check every 100ms
        
        return () => clearInterval(checkInterval);
    }, [ballNumber, socket]);

    // Only apply force to the cue ball when another player shoots
    useEffect(() => {
        if (!socket || ballNumber !== 0) return;

        const handlePlayerShot = ({ playerId, force }) => {
            // Only handle shots from other players when ball is valid and not in hole
            if (playerId !== socket.id && ref.current && !isShooting && !isInHole.current) {
                console.log(`Applying remote force to cue ball: ${force.x}, ${force.z}`);
                
                // Apply the force with rounding to reduce jitter
                ref.current.applyImpulse({
                    x: Math.round(force.x * 100) / 100, 
                    y: 0, 
                    z: Math.round(force.z * 100) / 100
                }, true);
                
                // Reset camera
                controls.target.set(0, 4, 0);
            }
        };

        socket.on('playerShot', handlePlayerShot);
        
        return () => {
            socket.off('playerShot', handlePlayerShot);
        };
    }, [socket, ballNumber, ref, isShooting, controls]);
    
    useEffect(() => {
        if (isShooting) {
            setForce(normalizePointer(pointer));
        }
        
        const handleClick = () => {
            if (!isShooting || isInHole.current) return;
            
            // Apply rounded force values to reduce jitter
            const roundedForce = {
                x: -Math.round(force.x * 100) / 100,
                y: 0,
                z: Math.round(force.z * 100) / 100
            };
            
            ref.current.applyImpulse(roundedForce, true);
            controls.target.set(0, 4, 0);
            setIsShooting(false);
            if (controls) controls.enabled = true;
            
            // Use the context's sendShot function with rounded values
            sendShot(roundedForce);
        };
    
        if (isShooting) {
            window.addEventListener('click', handleClick);
            return () => {
                window.removeEventListener('click', handleClick);
            };
        }
    }, [isShooting, ref, controls, force, sendShot, pointer]);

    // Reset the reporting state when ball is respawned and update isInHole
    useEffect(() => {
        const isInHoleNow = gameState.ballsInHole?.includes(ballNumber);
        isInHole.current = isInHoleNow;
        
        if (!isInHoleNow) {
            hasReportedHole.current = false;
        }
    }, [gameState.ballsInHole, ballNumber]);

    // Skip rendering if ball is in hole
    if (gameState.ballsInHole?.includes(ballNumber)) {
        return null;
    }

    return (
        <>
            <RigidBody 
                position={position} 
                linearDamping={0.4}
                angularDamping={0.6}
                friction={0.1}
                restitution={0.9}
                canSleep={true}
                sleepThreshold={0.05}
                ref={ref}
                colliders={false}
            >
                <BallCollider mass={1} args={[0.14, 32, 32]}/>
                <mesh castShadow onClick={handleClick}>
                    <sphereGeometry args={[0.14, 32, 32]} />
                    <meshStandardMaterial map={texture} metalness={0.5} roughness={0.2} />
                </mesh>
            </RigidBody>
            {isShooting && !isInHole.current && <ShootIndicator position={vec3(ref.current.translation())} forceVector={force} />}
        </>
    );
};

export default PoolBall;
