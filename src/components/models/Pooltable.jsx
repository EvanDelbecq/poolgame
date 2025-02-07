import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useTrimesh, Debug } from '@react-three/cannon'
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

  const [floorRef] = useTrimesh(() => ({
    args: [
      nodes.board.geometry.attributes.position.array.map(v => v * 0.05),
      nodes.board.geometry.index.array,
    ],
    mass: 0,
    material:'green-floor',
  }),
  useRef())
  const [bordersRef] = useTrimesh(() => ({
    args: [
      nodes.borders.geometry.attributes.position.array.map(v => v * 0.05),
      nodes.borders.geometry.index.array,
    ],
    mass: 0,
    material:'green',
  }),
  useRef())
  const [holesRef] = useTrimesh(() => ({
    args: [
      nodes.holes.geometry.attributes.position.array.map(v => v * 0.05),
      nodes.holes.geometry.index.array,
    ],
    mass: 0,
    material:'hole',
  }),
  useRef())
  const [woodRef] = useTrimesh(() => ({
    args: [
      nodes.wood.geometry.attributes.position.array.map(v => v * 0.05),
      nodes.wood.geometry.index.array,
    ],
    mass: 0,
  }),
  useRef())
  const [boundariesRef] = useTrimesh(() => ({
    args: [
      boundariesVertices.map(v => v * 0.05),
      new Uint16Array([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29
      ])
    ],
    mass: 0,
    material:'boundary',
    position: [0, -0.1, 0]
  }),
  useRef())
  return (
    <group {...props} dispose={null}>
      <group scale={0.05} >
        <mesh geometry={nodes.Cube024_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Cube026_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Plane029_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Plane030_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.borders.geometry} material={materials['Pool_Table.001']} ref={bordersRef} receiveShadow/>
        <mesh geometry={nodes.holes.geometry} material={materials['Pool_Table.001']} ref={holesRef} receiveShadow/>
        <mesh geometry={nodes.Plane036_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.Plane038_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.wood.geometry} material={materials['Pool_Table.001']} ref={floorRef} receiveShadow/>
        <mesh geometry={nodes.Plane041_Pool_Table_0.geometry} material={materials['Pool_Table.001']} />
        <mesh geometry={nodes.board.geometry} material={materials['Pool_Table.001']} ref={woodRef} receiveShadow />
        <mesh  ref={boundariesRef}>
          <bufferGeometry attach="geometry" {...boundariesGeometry} />
          <meshStandardMaterial visible={false}/>
        </mesh>
      </group>
    </group>
  )
}

useGLTF.preload('/pooltable.glb')
