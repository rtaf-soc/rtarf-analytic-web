import React from 'react'
import Defcon from './Components/Defcon'
import MapView from './Components/MapView'
import OverlayList from './Components/OverlayList'

const App = () => {
  return (
    <div className="bg-black h-screen flex items-start justify-end ">
      <OverlayList />
      <Defcon />
    </div>
  )
}

export default App
