import { useContactMaterial, useSphere } from "@react-three/cannon"
import { useLoader, useThree, useFrame } from "@react-three/fiber"
import { useEffect, useState } from "react"
import * as THREE from "three"

const PoolBall = ({position, ballNumber, props}) => {
    const [ref, api] = useSphere(() => ({mass:150, args: [0.17, 5, 5],position:position, material:'ball', angularDamping: 0.6, allowSleep: true,  ...props}))
    const texture = useLoader(THREE.TextureLoader, `/textures/Ball${ballNumber}.jpg`)
    const pointer  = useThree((state) => state.pointer)
    const controls = useThree((state) => state.controls)
    const camera = useThree((state) => state.camera)
    const [isShooting, setIsShooting] = useState(false)
    const [lookAt, setLookAt] = useState(new THREE.Vector3())
    const force = new THREE.Vector3(0,0,0)
    const forceArrow = new THREE.ArrowHelper(force, new THREE.Vector3(position[0],position[1],position[2]), 1, 0x00ff00)

    useContactMaterial(
        'ball',
        'ball',
        { friction: 0.4, restitution: 0.9 }
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
        { friction: 1, restitution: 0.5 }
      )

    const handleClick = (e) => {
        const ballPos = e.eventObject.position
        if (ballNumber !== 0) return
        if (isShooting) return
        setIsShooting(true)
        console.log(controls)
        controls.target.set(ballPos.x, ballPos.y, ballPos.z)
        camera.position.set(ballPos.x,9,ballPos.z)
    }               

    useFrame(() => {
        if (isShooting){
            force.set(-pointer.x, 0, pointer.y).multiplyScalar(20)  
            forceArrow.setDirection(force)
            forceArrow.setLength((Math.sqrt(force.x**2 + force.z**2))/2)
            console.log(force)
            addEventListener('click', () => {
                if (!isShooting) return
                api.velocity.set(force.x, 0, force.z)
                controls.target.set(0,4,0)
                
                setIsShooting(false)
            })  
        }
        
    })
    
  return (
    <>
        <mesh ref={ref} castShadow onClick={e => {handleClick(e)}}
        >
        <sphereGeometry args={[0.175, 32, 32]} />
        <meshStandardMaterial map={texture} metalness={0.5}/>
        </mesh>
        {isShooting &&<primitive object={forceArrow} />}

    </>
  )
}

export default PoolBall
