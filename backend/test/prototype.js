const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient

const app = express()
app.use(bodyParser.json())

const url = 'mongodb://puru:19880818@ds155201.mlab.com:55201/test_new_mongodb'

app.listen(3000, () => console.log('Listening to port 3000'))
app.get('/user/:id', (req, res) => res.send(`Welcome to the homepage of user ${req.params.id}.`))

const main = async () => {
  const db = await MongoClient.connect(url)
  app.post('/news', async (req, res) => {
    const data = req.body
    data.timestamp = new Date()
    console.log(data)
    const r = await db.collection('News').insertOne(data)
    res.send('Success')
  })
}

main()
