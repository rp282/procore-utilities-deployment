import { useSession } from 'next-auth/react'
import { useState } from 'react'
import Layout from '../components/layout'
import styles from '../styles/Home.module.css'

export default function Home() {
  const {data, status} = useSession()
  const [print, setPrint] = useState({})
  async function handleRequest() {
    fetch(`/api/procore/test`)
  }
  return (
    <Layout>
      <div className={styles.container}>
        <pre>Welcome</pre>
        <div>
          <div>
            <button onClick={() => handleRequest()}>Request</button>
          </div>
          <div>
            <pre style={{fontSize:'1rem'}}>{JSON.stringify(print, null, 2)}</pre>
          </div>
        </div>
      </div>
    </Layout>
  )
}
