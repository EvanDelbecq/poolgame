import { useLoader, useThree } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"
import ShootIndicator from "./ShootIndicator"
import { BallCollider, RigidBody, vec3} from "@react-three/rapier"
import { useGame } from '../../context/GameContext'

const PoolBall = ({position, ballNumber, props}) => {
    const ref = useRef(null)
    const texture = useLoader(THREE.TextureLoader, `/textures/Ball${ballNumber}.jpg`)
    const pointer  = useThree((state) => state.pointer)
    const controls = useThree((state) => state.controls)
    const camera = useThree((state) => state.camera)
    const [isShooting, setIsShooting] = useState(false)
    const [lookAt, setLookAt] = useState(new THREE.Vector3())
    const [force, setForce] = useState(new THREE.Vector3(0,0,0))
    const pos = useRef(new THREE.Vector3())
    const { gameState, sendShot, socket } = useGame() // Use sendShot instead of socket directly

    const handleClick = (e) => {
        console.log("Game state on click:", gameState)
        if (ballNumber !== 0 || isShooting || !gameState.isMyTurn) return
        controls.target.set(ref.current.translation().x, 4, ref.current.translation().z)
        camera.position.set(ref.current.translation().x,15,ref.current.translation().z)
        setIsShooting(true)
    }               
    
    const normalizePointer = (pointer) => {
        const maxForce = 15
        const range = [-maxForce, maxForce];
        const normalizedX = THREE.MathUtils.clamp(pointer.x * maxForce, range[0], range[1]);
        const normalizedY = THREE.MathUtils.clamp(pointer.y * maxForce, range[0], range[1]);
        return new THREE.Vector3(-normalizedX, 0, normalizedY);
    }

    const handleSleep = () => {
        // Check if the ball is in the hole
        const ballPosition = ref.current.translation()
        if (ballPosition.y < 3.7) {
            // Emit the ball in hole event
            socket.emit('ballInHole', { ballNumber });
            console.log(`Ball ${ballNumber} is in the hole`);
        }
    }

    socket.on('playerShot', ({ force }) => {
        if (ref.current && !isShooting) {
            ref.current.applyImpulse({x: force.x, y: 0, z: force.z}, true)
            controls.target.set(0, 4, 0)
        }
    }
    )
    useEffect(() => {
        if (isShooting) {
            setForce(normalizePointer(pointer))
        }
        
        const handleClick = () => {
            if (isShooting) {
                // Apply force to the ball
                ref.current.applyImpulse({x: force.x, y: 0, z: force.z}, true)
                controls.target.set(0, 4, 0)
                setIsShooting(false)
                if (controls) controls.enabled = true
                
                // Use the context's sendShot function instead of direct socket emit
                // This ensures the local state is updated properly
                sendShot({ x: force.x, y: 0, z: force.z })
            }
        }
    
        if (isShooting) {
            window.addEventListener('click', handleClick)
            return () => {
                window.removeEventListener('click', handleClick)
            }
        }
    }, [isShooting, ref, controls, force, sendShot])

  return (
    <>
        <RigidBody 
            position={position} 
            linearDamping={0.3}
            angularDamping={0.5}
            friction={0}
            restitution={0.95}
            canSleep={true}
            ref={ref}
            colliders={false}
            onSleep={() => handleSleep()}
            sensors={true}
            >
            <BallCollider mass={1} args={[0.14, 32, 32]}/>
            <mesh castShadow onClick={e => {handleClick(e)}} >
                <sphereGeometry args={[0.14, 32, 32]} />
                <meshStandardMaterial map={texture} metalness={0.5}/>
            </mesh>
        </RigidBody>
        {isShooting && <ShootIndicator position={vec3(ref.current.translation())} forceVector={force} />}
    </>
  )
}

export default PoolBall
