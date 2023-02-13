
export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      let project_ids = JSON.parse(req.body)
      let Authorization = req.headers.authorization
      let tasks = {
        remaining: 2,
        monitoredResources: [],
        budgetLineItems: []
      }
      await new Promise(async (resolve, reject) => {
        let result = await fetch(`${process.env.NEXTAUTH_URL}/api/procore/monitored-resources`, {
          method: 'POST',
          headers: {Authorization},
          body: JSON.stringify(project_ids)
        })
        tasks.monitoredResources = await result.json()
        tasks.remaining--

        let uniqueLines = {}
        tasks.monitoredResources.forEach(forecast => {
          uniqueLines[`${forecast.budget_line_item_id}${forecast.project_id}`] = {
            id:forecast.budget_line_item_id,
            project_id:forecast.project_id
          }
        })
        let lines = []
        for (let property in uniqueLines) {
          lines.push(uniqueLines[property])
        }

        fetch(`${process.env.NEXTAUTH_URL}/api/procore/budget-line-items`, {
            method:'POST',
            headers:{Authorization},
            body: JSON.stringify(lines)
        }).then(async (res) => {
          tasks.budgetLineItems = await res.json()
          tasks.remaining--
          if (tasks.remaining <= 0) resolve()
        })
        
      })
      res.status(200).json({monitoredResources:tasks.monitoredResources, budgetLineItems:tasks.budgetLineItems})
      break;
    default:      
      res.status(400).json({ text: 'Invalid request method' })
      break;
  }
}
