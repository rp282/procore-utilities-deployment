
export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      let project_ids = JSON.parse(req.body)
      let Authorization = req.headers.authorization

      let data = []      

      let threadCount = Math.min(project_ids.length, 6)
      let completedThreadCount = {value:0}
      await new Promise((resolve, reject) => {
        for (let i = 0; i < threadCount; i++) {
          getBudgetLineItems(i, threadCount, resolve)
        }
      })

      async function getBudgetLineItems(i, threadCount, resolve) {
        if (i >= project_ids.length) {
          completedThreadCount.value++
          if (completedThreadCount.value >= threadCount) {
            return resolve()
          }
          return
        }
        let result = await fetch(`https://api.procore.com/rest/v1.0/budget_views/366834/detail_rows?project_id=${project_ids[i]}`, {
          method: "GET",
          headers: {
            'Procore-Company-Id':9828,
            Authorization
          }
        })      
        let json = await result.json()
        if (json.message == undefined) data = [...data, ...json] // message is returned if error
        getBudgetLineItems(i += threadCount, threadCount, resolve)
      }
      res.status(200).json(data)
      break;
    default:      
      res.status(400).json({ text: 'Invalid request method' })
      break;
  }
}
