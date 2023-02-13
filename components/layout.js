import Header from "./header"
import styles from '../styles/Layout.module.css'

import { signIn, useSession } from 'next-auth/react'
import Link from "next/link"

export default function Layout({ children }) {

  const {data, status} = useSession()

  return (
    <div className="container">
      <Header />
        {data?.user?.login == undefined ?
          <div className={styles.signInContainer}>
              <pre>
                <Link 
                  href='api/auth/signin'
                  onClick={e => {
                    e.preventDefault()
                    signIn('procore')
                  }}
                >Sign In</Link>
              </pre>
          </div>
          :
          <>
            {children}
          </>
        }
    </div>
  )
}
