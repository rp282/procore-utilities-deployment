
export default async function handler(req, res) {
  let Authorization = req.headers.authorization
  switch (req.method) {
    case 'POST':
      let project_ids = JSON.parse(req.body)

      let data = []      

      let threadCount = Math.min(project_ids.length, 6)
      let completedThreadCount = {value:0}
      await new Promise((resolve, reject) => {
        for (let i = 0; i < threadCount; i++) {
          getMonitoredResources(i, threadCount, resolve)
        }
      })

      async function getMonitoredResources(i, threadCount, resolve) {
        if (i >= project_ids.length) {
          completedThreadCount.value++
          if (completedThreadCount.value >= threadCount) {
            return resolve()
          }
          return
        }
        let result = await fetch(`https://api.procore.com/rest/v1.0/projects/${project_ids[i]}/monitoring_resources?forecast_start_date=${(new Date().toJSON().slice(0,10))}`, {
          method: "GET",
          headers: {
            'Procore-Company-Id':9828,
            Authorization
          }
        })      
        let json = await result.json()
        if (json.message == undefined) data = [...data, ...json.map(d => {return {...d, project_id:project_ids[i]}})] // message is returned if error
        getMonitoredResources(i += threadCount, threadCount, resolve)
      }
      res.status(200).json(data)
      break;
    case 'PATCH': 
      let { project_id, id } = req.query
      let result = await fetch(`https://api.procore.com/rest/v1.0/projects/${project_id}/monitoring_resources/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type':'application/json',
          'Procore-Company-Id':9828,
          Authorization
        },
        body: req.body
      })
      let json = await result.json()
      res.status(200).json(json)
      break;
    default:      
      res.status(400).json({ text: 'Invalid request method' })
      break;
  }
}
