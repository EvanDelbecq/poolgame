import React, { useEffect } from 'react'
import { useRef } from 'react'
import * as THREE from 'three'

const ShootIndicator = ({forceVector, ...props}) => {
    const vector = useRef(new THREE.Vector3(0, 0, 0))
    useEffect(() => {
        vector.current.set(forceVector.x/20, 0, forceVector.z/20)
    }, [forceVector])

return (
    <group  {...props}>
            <mesh rotation={[Math.PI*0.5, 0, 0]}>
                    <torusGeometry args={[0.3, 0.05, 16, 100]} />
                    <meshStandardMaterial color={'red'} />
            </mesh>
            <group>
                {[...Array(10)].map((_, i) => (
                    <mesh key={i} position={[vector.current.x * (i+1), 0, vector.current.z * (i+1)]}>
                        <sphereGeometry args={[0.1, 32, 32]} />
                        <meshStandardMaterial color={'red'} />
                    </mesh>
                ))}
            </group>
    </group>
)
}

export default ShootIndicator
