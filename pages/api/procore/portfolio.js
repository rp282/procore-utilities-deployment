// Returns json
import { formatDuration } from "../../../utils/formatting"
export default async function handler(req, res) {
    switch (req.method) {
      case 'GET':
        let result = await fetch('https://api.procore.com/rest/v1.1/projects?company_id=9828&view=normal&per_page=300', {
          method:'GET',
          headers: {'Authorization': req.headers.authorization}
        })
        let json = await result.json()
        console.log('Procore remaining Procore API calls:', result.headers.get('x-rate-limit-remaining'))
        console.log('Resets in:', formatDuration((result.headers.get('X-Rate-Limit-Reset')-Date.now()/1000)*1000))
        console.log('@', new Date(result.headers.get('X-Rate-Limit-Reset')*1000).toLocaleTimeString())
        res.status(200).json(json)
        break;
      default:      
        res.status(400).json({ text: 'Invalid request method' })
        break;
    }
  }
  