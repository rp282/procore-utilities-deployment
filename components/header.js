import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"
import { formatDuration } from "../utils/formatting"
import { useContext } from "react"
import { TabContext } from "../pages/_app"
import styles from '../styles/Nav.module.css'


export default function Header() {
  const {data, status} = useSession()
  const { tab, setTab } = useContext(TabContext)
  const loading = status === "loading"
  const authenticated = status === "authenticated"

  if (data?.user.procore.error != undefined) {
    // Token is most likely expired
    signOut('procore')
  }

  return (
    <nav className='header'>
      <title>Procore Utilities</title>
      <Link 
        onClick={() => setTab('home')}
        className='title__nav' 
        href='/'>
        Procore Utilities
      </Link>
      <ul className={`${!data && loading ? 'loading' : 'loaded'}`}>
        <li className={tab == 'monitored-resources' ? styles.currentTab : ''}>
          <Link 
            onClick={() => setTab('monitored-resources')}
            href='/monitored-resources'>
            Monitored Resources
          </Link>
        </li>
        {!loading && !authenticated && (
        <li>
          <Link 
            href='api/auth/signin'
            onClick={e => {
              e.preventDefault()
              signIn('procore')
            }}
          >Sign In</Link>
        </li>
        )}
        {!loading && authenticated && (
        <li>
          <Link 
            href='/api/auth/signout' 
            onClick={e => {
            e.preventDefault()
            signOut()
          }}
          >Sign Out</Link>
        </li>
        )}
      </ul>
    </nav>
  )
}
