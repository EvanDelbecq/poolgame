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
    const [inHole, setInHole] = useState(false)
    const pos = useRef(new THREE.Vector3())
    const { gameState, socket } = useGame()

    const handleClick = (e) => {
        console.log(gameState.isMyTurn)
        if (ballNumber !== 0 || isShooting || !gameState.isMyTurn ) return
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
        
    }

    
    useEffect(() => {
        if (isShooting) {
            setForce(normalizePointer(pointer))
        }
        const handleClick = () => {
            if (isShooting) {
                ref.current.applyImpulse({x: force.x,y: 0,z: force.z}, true)
                controls.target.set(0, 4, 0)
                setIsShooting(false)
                if (controls) controls.enabled = true
                
                // Emit shot to other player
                socket.emit('shot', { force: { x: force.x, y: 0, z: force.z } })
            }
        }
    
        if (isShooting) {
            window.addEventListener('click', handleClick)
            return () => {
                window.removeEventListener('click', handleClick)
            }
        }
    }, [isShooting, ref, controls, force, socket])

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
            colliders={ false }
            onCollisionEnter={(e) => {if (e.other.rigidBody.userData.isHole && inHole === false) setInHole(true)}}
            onSleep={() => handleSleep() }
            sensors={true}
            >
            <BallCollider mass={1} args={[0.13, 32, 32]}/>
            <mesh castShadow onClick={e => {handleClick(e)}} >
                <sphereGeometry args={[0.13, 32, 32]} />
                <meshStandardMaterial map={texture} metalness={0.5}/>
            </mesh>
        </RigidBody>
        {isShooting &&<ShootIndicator position={vec3(ref.current.translation())} forceVector={force} />}
    </>
  )
}

export default PoolBall
