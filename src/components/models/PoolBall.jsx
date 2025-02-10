import { useLoader, useThree } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"
import ShootIndicator from "./ShootIndicator"
import { BallCollider, RigidBody, vec3} from "@react-three/rapier"

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

    const handleClick = (e) => {
        if (ballNumber !== 0 || isShooting ) return
        controls.target.set(pos.current.x, pos.current.y, pos.current.z)
        camera.position.set(pos.current.x,15,pos.current.z)
        setIsShooting(true)
    }               
    const normalizePointer = (pointer) => {
        const maxForce = 15
        const range = [-maxForce, maxForce];
        const normalizedX = THREE.MathUtils.clamp(pointer.x * maxForce, range[0], range[1]);
        const normalizedY = THREE.MathUtils.clamp(pointer.y * maxForce, range[0], range[1]);
        return new THREE.Vector3(-normalizedX, 0, normalizedY);
    }

    const handleCollide = (e) => {
        console.log(e)
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
            }
        }
    
        if (isShooting) {
            window.addEventListener('click', handleClick)
            return () => {
                window.removeEventListener('click', handleClick)
            }
        }
    }, [isShooting, ref, controls, force])

    useEffect(() => {

    },[])
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
