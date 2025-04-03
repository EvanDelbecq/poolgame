import { OrbitControls} from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Pooltable from './models/Pooltable'
import PoolBall from './models/PoolBall'
import {Perf} from 'r3f-perf'
import ShootIndicator from './models/ShootIndicator'
import { useGame } from '../context/GameContext'
import { useState } from 'react'

const Experience = () => {
    const { socket } = useGame()
    const [paused, setPaused] = useState(false)

    const solidBalls = [1,2,3,4,5,6,7]
    const stripedBalls = [9,10,11,12,13,14,15]
    const cueBall = 0
    const eightBall = 8
    const balls = [eightBall, ...solidBalls, ...stripedBalls]
    const xStep = 0.255
    const zStep = 0.14
    const ballYpos = 3.8
    const ballPositions = {
        0: [-4, ballYpos, 0], // cue ball position
        // First row
        1: [xStep, ballYpos, 0],
        // Second row
        9: [2 * xStep, ballYpos, zStep],
        3: [2 * xStep, ballYpos, -zStep],
        // Third row
        10: [3 * xStep, ballYpos, 2 * zStep],
        8: [3 * xStep, ballYpos, 0],
        11: [3 * xStep, ballYpos, -2 * zStep],
        // Fourth row
        6: [4 * xStep, ballYpos, 3 * zStep],
        14: [4 * xStep, ballYpos, zStep],
        2: [4 * xStep, ballYpos, -zStep],
        4: [4 * xStep, ballYpos, -3 * zStep],
        // Fifth row
        5: [5 * xStep, ballYpos, 4 * zStep],
        12: [5 * xStep, ballYpos, 2 * zStep],
        13: [5 * xStep, ballYpos, 0],
        7: [5 * xStep, ballYpos, -2 * zStep],
        15: [5 * xStep, ballYpos, -4 * zStep],
    }

    socket.on('gameStart', () => {
        setPaused(false)
    }
    )

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
        <Physics debug gravity={ [ 0, - 9.81, 0 ] } paused={paused} >
            <PoolBall position={ballPositions[cueBall]} ballNumber={cueBall}/>
            {balls.map(ball => <PoolBall key={ball} position={ballPositions[ball]} ballNumber={ball}/>)}
            <Pooltable position={[0, 0, 0]} /> 
        </Physics>
    </>
  )
}

export default Experience
