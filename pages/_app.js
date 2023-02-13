import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import React, { useEffect, useState } from 'react'

export const TabContext = React.createContext()

function MyApp({ 
  Component, 
  pageProps :{ session, ...pageProps } 
}) {
  const [tab, setTab] = useState('home')
  
  // Set initial tab
  useEffect(() => {
    switch(new URL(window.location.href).pathname) {
      case '/':
        setTab('home')
        break;
      case '/monitored-resources':
        setTab('monitored-resources')
        break;
      default: 
        console.log('unknown tab path')
        break;
    }
  }, [])

  return (
    <TabContext.Provider value={{tab, setTab}}>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </TabContext.Provider>
  )
}

export default MyApp
