import NextAuth from "next-auth"

export const authOptions = {
  // Configure one or more authentication providers
  providers: [{
    id: "procore",
    name: "Procore",
    type: "oauth",
    params: { grant_type: "authorization_code" },
    token: "https://api.procore.com/oauth/token",
    requestToken: "https://api.procore.com/oauth/token",
    authorization: {
      url:"https://api.procore.com/oauth/authorize",
      params: {
        client_id: process.env.PROCORE_ID,
        response_type: 'code',
        scope:null
      }
    },
    userinfo: "https://api.procore.com/rest/v1.0/me",
    redirect_uri:`${process.env.NEXTAUTH_URL}/api/auth/callback/procore`,
    clientId: process.env.PROCORE_ID,
    clientSecret: process.env.PROCORE_SECRET,
    refresh_token: "string",
    profile(profile) {
      // console.log('profile params:', profile)
      return {
        id: profile.id,
        name: profile.name,
        login: profile.login
      }
    },
  }],
  callbacks: {
    // redirect: async (params) => {
    //   console.log('redirect params:', params)
    //   let { url, baseUrl } = params
    //   // Allows relative callback URLs
    //   if (url.startsWith("/")) return `${baseUrl}${url}`
    //   // Allows callback URLs on the same origin
    //   else if (new URL(url).origin === baseUrl) return url
    //   return baseUrl
    // },
    jwt: async (params) => {
      let { token, account, profile } = params
      // console.log('jwt parameters:', params)
      if (account) {
        token.procore = account
      }
      if (profile) {
        token.id = profile.id
        token.login = profile.login
      }

      if (token.procore != undefined && token.procore.expires_at*1000 < Date.now()) {
        let result = await fetch('https://api.procore.com/oauth/token', {
          method:'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            grant_type:'refresh_token',
            client_id:process.env.PROCORE_ID,
            client_secret:process.env.PROCORE_SECRET,
            redirect_uri:`${process.env.NEXTAUTH_URL}/api/auth/callback/procore`,
            refresh_token:token.procore.refresh_token,
          }),
          json:true
        })
        let json = await result.json()
        console.log('refresh json', json)
        if (json.error != undefined) token.procore.error = json
        else token.procore = {...token.procore,...json}
      }
      // console.log('token', token)
      return token
    },
    session: async (params) => {
      let { session, token } = params
      // console.log('session parameters:', params)
      session.user = token
      return session
    }
  }
}
export default NextAuth(authOptions)