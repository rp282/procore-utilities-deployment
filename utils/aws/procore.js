const mysql = require('mysql')
const awsConnectionConfig = {
    host     : process.env.AWS_HOST,
    user     : process.env.AWS_USER,
    password : process.env.AWS_PASSWORD,
    database : process.env.AWS_PROCORE_DB
}

export async function query(query) {
    console.log('HELLO WORLD')
    const connection = mysql.createConnection(awsConnectionConfig)
    console.log('query:', query)
    connection.query(query, (err, res, fields) => {
        if (err) console.error(err)
        console.log('HELLO WORLD 1')
        console.log({res, fields})
        return {res, fields}
    })
}