
export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      let line_item_ids = JSON.parse(req.body)
      let Authorization = req.headers.authorization

      let data = []      

      let threadCount = Math.min(line_item_ids.length, 6)
      let completedThreadCount = {value:0}
      await new Promise((resolve, reject) => {
        for (let i = 0; i < threadCount; i++) {
          getBudgetLineItems(i, threadCount, resolve)
        }
      })

      async function getBudgetLineItems(i, threadCount, resolve) {
        if (i >= line_item_ids.length) {
          completedThreadCount.value++
          if (completedThreadCount.value >= threadCount) {
            return resolve()
          }
          return
        }
        let result = await fetch(`https://api.procore.com/rest/v1.1/budget_line_items/${line_item_ids[i].id}?project_id=${line_item_ids[i].project_id}`, {
          method: "GET",
          headers: {
            'Procore-Company-Id':9828,
            Authorization
          }
        })      
        let json = await result.json()
        data.push(json)
        getBudgetLineItems(i += threadCount, threadCount, resolve)
      }
      res.status(200).json(data)
      break;
    default:      
      res.status(400).json({ text: 'Invalid request method' })
      break;
  }
}
