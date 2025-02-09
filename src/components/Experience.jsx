import { OrbitControls} from '@react-three/drei'
import { Physics, Debug } from '@react-three/cannon'
import Pooltable from './models/Pooltable'
import PoolBall from './models/PoolBall'
import {Perf} from 'r3f-perf'
import ShootIndicator from './models/ShootIndicator'


const Experience = () => {
    const solidBalls = [1,2,3,4,5,6,7]
    const stripedBalls = [9,10,11,12,13,14,15]
    const cueBall = 0
    const eightBall = 8
    const balls = [eightBall, ...solidBalls, ...stripedBalls]
    const xStep = 0.3
    const zStep = 0.175
    const ballPositions = {
        0: [-4, 4.34, 0], // cue ball position
        // First row
        1: [xStep, 4.34, 0],
        // Second row
        9: [2 * xStep, 4.34, zStep],
        3: [2 * xStep, 4.34, -zStep],
        // Third row
        10: [3 * xStep, 4.34, 2 * zStep],
        8: [3 * xStep, 4.34, 0],
        11: [3 * xStep, 4.34, -2 * zStep],
        // Fourth row
        6: [4 * xStep, 4.34, 3 * zStep],
        14: [4 * xStep, 4.34, zStep],
        2: [4 * xStep, 4.34, -zStep],
        4: [4 * xStep, 4.34, -3 * zStep],
        // Fifth row
        5: [5 * xStep, 4.34, 4 * zStep],
        12: [5 * xStep, 4.34, 2 * zStep],
        13: [5 * xStep, 4.34, 0],
        7: [5 * xStep, 4.34, -2 * zStep],
        15: [5 * xStep, 4.34, -4 * zStep],
    }

  return (
    <>
        <ambientLight intensity={1} color={'red'}/>
        <OrbitControls target={[0,4,0]} makeDefault/>
        {<spotLight position={[0, 15, 0]} angle={0.55} intensity={500} penumbra={0.2}  castShadow/> }
        {/* <mesh position={[0, 4.34, 0]}>
            <sphereGeometry args={[0.17, 32, 32]} />
            <meshStandardMaterial color={'white'} />
        </mesh> */}
        <Perf />
        <Physics gravity={[0,-9.8,0]} broadphase='SAP'>
            <Debug color={'blue'} scale={0}>
                <PoolBall position={ballPositions[cueBall]} ballNumber={cueBall}/>
                {balls.map(ball => <PoolBall key={ball} position={ballPositions[ball]} ballNumber={ball}/>)}
                <Pooltable position={[0, 0, 0]} /> 
            </Debug>
        </Physics>
    </>
  )
}

export default Experience
