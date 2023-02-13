
// Returns json
export default async function handler(req, res) {
    let Authorization = req.headers.authorization
    switch (req.method) {
      case 'GET':
        let { id } = req.query
        let result = await fetch(`https://api.procore.com/rest/v1.0/projects/${id}/work_breakdown_structure/wbs_codes?can_select_divisions=false`, {
            method:'GET',
            headers: {
                Authorization,
                'Procore-Company-Id':9828
            }
        })
        let json = await result.json()
        res.status(200).json(json)
        break;
      case 'POST':
          let project_ids = JSON.parse(req.body)
          let data = []      
    
          let threadCount = Math.min(project_ids.length, 6)
          let completedThreadCount = {value:0}
          await new Promise((resolve, reject) => {
            for (let i = 0; i < threadCount; i++) {
              getWBS(i, threadCount, resolve)
            }
          })
    
          async function getWBS(i, threadCount, resolve) {
            if (i >= project_ids.length) {
              completedThreadCount.value++
              if (completedThreadCount.value >= threadCount) {
                return resolve()
              }
              return
            }
            let result = await fetch(`https://api.procore.com/rest/v1.0/projects/${project_ids[i]}/work_breakdown_structure/wbs_codes?can_select_divisions=false`, {
              method: "GET",
              headers: {
                'Procore-Company-Id':9828,
                Authorization
              }
            })      
            let json = await result.json()
            data = [...data, ...json]
            getWBS(i += threadCount, threadCount, resolve)
          }
          res.status(200).json(data)
          break;
      default:      
        res.status(400).json({ text: 'Invalid request method' })
        break;
    }
  }
  