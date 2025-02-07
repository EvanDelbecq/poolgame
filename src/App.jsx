import './App.css'
import {  Canvas } from '@react-three/fiber'
import Experience from './components/Experience'

function App() {
  return (
    <Canvas style={{background: 'black'}} camera={{position:[0,10,7]}} shadows>
      <Experience/>
    </Canvas>
  )
}

export default App
