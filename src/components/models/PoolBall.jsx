import { useContactMaterial, useSphere } from "@react-three/cannon"
import { useLoader, useThree } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"
import ShootIndicator from "./ShootIndicator"
import { threshold } from "three/tsl"

const PoolBall = ({position, ballNumber, props}) => {
    const [ref, api] = useSphere(() => ({mass:20, args: [0.17, 5, 5],position:position, material:'ball', angularDamping: 0.8, allowSleep: true, onCollide: (e) => handleCollide(e), ...props}))
    const texture = useLoader(THREE.TextureLoader, `/textures/Ball${ballNumber}.jpg`)
    const pointer  = useThree((state) => state.pointer)
    const controls = useThree((state) => state.controls)
    const camera = useThree((state) => state.camera)
    const [isShooting, setIsShooting] = useState(false)
    const [lookAt, setLookAt] = useState(new THREE.Vector3())
    const [force, setForce] = useState(new THREE.Vector3(0,0,0))
    const pos = useRef(new THREE.Vector3())

    useContactMaterial(
        'ball',
        'ball',
        { friction: 0, restitution: 0.95 }
      )
    useContactMaterial(
        'ball',
        'green',
        { friction: 1, restitution: 0.85 }
      )
    useContactMaterial(
        'ball',
        'green-floor',
        { friction: 1, restitution: 0 }
      )
    useContactMaterial(
        'ball',
        'hole',
        { friction: 1, restitution: 0 }
      )
    useContactMaterial(
        'ball',
        'boundary',
        { friction: 1, restitution: 0.5}
      )

    const handleClick = (e) => {
        if (ballNumber !== 0 || isShooting ) return
        controls.target.set(pos.current.x, pos.current.y, pos.current.z)
        camera.position.set(pos.current.x,15,pos.current.z)
        setIsShooting(true)
    }               
    const normalizePointer = (pointer) => {
        const maxForce = 1.5
        const range = [-maxForce, maxForce];
        const normalizedX = THREE.MathUtils.clamp(pointer.x * maxForce, range[0], range[1]);
        const normalizedY = THREE.MathUtils.clamp(pointer.y * maxForce, range[0], range[1]);
        return new THREE.Vector3(-normalizedX, 0, normalizedY);
    }

    const handleCollide = (e) => {
        console.log(e)
    }

    useEffect(
        () =>
          api.position.subscribe((v) => {
            return (pos.current = new THREE.Vector3(v[0], v[1], v[2]));
          }),
        [api.position]
      );
    
    useEffect(() => {
        if (isShooting) {
            setForce(normalizePointer(pointer))
        }
        const handleClick = () => {
            if (isShooting) {
                api.velocity.set(force.x * 20, 0, force.z * 20)
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
    }, [isShooting, api, controls, force])
  return (
    <>
        <mesh ref={ref} castShadow onClick={e => {handleClick(e)}} 
        >
        <sphereGeometry args={[0.175, 32, 32]} />
        <meshStandardMaterial map={texture} metalness={0.5}/>
        </mesh>
        {isShooting &&<ShootIndicator position={pos.current} forceVector={force} />}

    </>
  )
}

export default PoolBall
