import './App.css'
import {  Canvas } from '@react-three/fiber'
import Experience from './components/Experience'
import { GameProvider } from './context/GameContext'

function App() {
  return (
    <GameProvider>
      {/* <h1 style={{position:'absolute', color:'white', zIndex: 1}}>Strip :</h1> */}
      <Canvas style={{background: 'black'}} camera={{position:[0,10,7]}} shadows>
        <Experience/>
      </Canvas>
    </GameProvider>
  )
}

export default App
