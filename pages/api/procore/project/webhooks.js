import { query } from '../../../../utils/aws/procore'

const { v4: uuidv4 } = require('uuid')

export default async function handler(req, res) {
    query(`INSERT INTO procore.webhooks (id,json) VALUES ('${uuidv4()}','${req.body}');`)
    res.status(200).send()
}
  