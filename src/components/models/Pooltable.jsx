import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useTrimesh, Debug } from '@react-three/cannon'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'


export default function Model(props) {
  const { nodes, materials } = useGLTF('/pooltable.glb')
  const boundariesGeometry = new THREE.BufferGeometry()
  const width = 120
  const heightBottom = 90
  const heightTop = 125
  const depth = 65

  const boundariesVertices = new Float32Array([
    // Front face
    -width, heightBottom, depth,  width, heightBottom, depth,  width, heightTop, depth,
    -width, heightBottom, depth,  width, heightTop, depth, -width, heightTop, depth,
    // Back face
    -width, heightBottom, -depth,  width, heightTop, -depth,  width, heightBottom, -depth,
    -width, heightBottom, -depth, -width, heightTop, -depth,  width, heightTop, -depth,
    // Left face
    -width, heightBottom, -depth, -width, heightBottom, depth, -width, heightTop, depth,
    -width, heightBottom, -depth, -width, heightTop, depth, -width, heightTop, -depth,
    // Right face
    width, heightBottom, -depth,  width, heightTop, depth,  width, heightBottom, depth,
    width, heightBottom, -depth,  width, heightTop, -depth,  width, heightTop, depth,
    // Top face
    -width, heightTop, -depth, -width, heightTop, depth,  width, heightTop, depth,
    -width, heightTop, -depth,  width, heightTop, depth,  width, heightTop, -depth
  ])

  boundariesGeometry.setAttribute('position', new THREE.BufferAttribute(boundariesVertices, 3))

  console.log(nodes.borders.geometry)
  return (
    <group {...props} dispose={null}>
      <group scale={0.05} >
        <mesh geometry={nodes.Cube024_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Cube026_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Plane029_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Plane030_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <RigidBody
          friction={1}
          restitution={1}
          type='fixed'
          colliders={'trimesh'}
        >
          <mesh geometry={nodes.borders.geometry} material={materials['Pool_Table.001']} receiveShadow/>
        </RigidBody>
        <RigidBody
          friction={1}
          restitution={0}
          type='fixed'
          colliders={'trimesh'}
        >
          <mesh geometry={nodes.holes.geometry} material={materials['Pool_Table.001']} receiveShadow/>
        </RigidBody>
        <mesh geometry={nodes.Plane036_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Plane038_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <RigidBody
          friction={1}
          restitution={0}
          type='fixed'
          colliders={'trimesh'}
        >
          <mesh geometry={nodes.wood.geometry} material={materials['Pool_Table.001']}  receiveShadow/>
        </RigidBody>
        <mesh geometry={nodes.Plane041_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <RigidBody
          friction={1}
          type='fixed'
          colliders={'trimesh'}
        >
          <mesh geometry={nodes.board.geometry} material={materials['Pool_Table.001']} receiveShadow />
        </RigidBody>
        <RigidBody
          friction={1}
          restitution={1.1}
          type='fixed'
          colliders={'trimesh'}
        >
          <mesh  >
            <bufferGeometry attach="geometry" {...boundariesGeometry} />
            <meshStandardMaterial visible={false}/>
          </mesh>
        </RigidBody>
      </group>
    </group>
  )
}

useGLTF.preload('/pooltable.glb')
