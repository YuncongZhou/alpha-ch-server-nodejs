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
  // post news and comment
  app.post('/data', async (req, res) => {
    const data = req.body
    data.timestamp = new Date()
    data.upvote = 0
    data.downvote = 0
    data.comments = {}
    console.log(data)
    const r = await db.collection('Data').insertOne(data)
    if (data.type === 'news') {
      console.log('News added to the database.')
    } else {
      console.log('Comment added to the database.') // Updating comment array is under development
    }
    res.send('Success')
  })
  // retreive news and comment sorted by timestamp in reversed order
  app.get('/data', async (req, res) => {
    const timeline = await db.collection('Data').find().sort({ timestamp: -1 }).toArray()
    res.send(timeline)
  })
}

main()
