import { query } from '../../../utils/aws/procore'

const { v4: uuidv4 } = require('uuid')

export default async function handler(req, res) {
    let hookExample = {
        "user_id": 7592766,
        "ulid": "01GRW0P0P0N9S16Z646QZ067VP",
        "timestamp": "2023-02-09T21:18:04.331952Z",
        "resource_name": "Budget View Snapshots",
        "resource_id": 572771,
        "project_id": 1681330,
        "metadata": {
        "source_user_id": 7592766,
        "source_project_id": 1681330,
        "source_operation_id": null,
        "source_company_id": 9828,
        "source_application_id": null
        },
        "id": 34233744203,
        "event_type": "delete",
        "company_id": 9828,
        "api_version": "v2"
    }
    fetch(`https://sn4yjc7xumd7gdtl4ipb4wbmim0vggou.lambda-url.us-west-1.on.aws/`, {
        method:'POST',
        body: JSON.stringify(hookExample)
    })
    .then(async result => {
        console.log('result', result)
        res.json({text:result})
    }) 
}
  
