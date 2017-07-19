const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const app = express()
app.use(bodyParser.json())

const url = process.env.URL

app.listen(3000, () => console.log('Listening to port 3000'))
app.get('/user/:id', (req, res) => res.send(`Welcome to the homepage of user ${req.params.id}.`))

const main = async () => {
  const db = await MongoClient.connect(url)
  // post news and comment
  app.post('/data', async (req, res) => {
    const data = {}
    data.type = req.body.type
    data.url = req.body.url
    data.body = req.body.body
    data.timestamp = new Date()
    data.upvote = 0
    data.downvote = 0
    data.comment_ids = []
    if (data.type === 'news') {
      if (!await db.collection('Data').findOne({ url: data.url })) {
        const r = await db.collection('Data').insertOne(data)
        console.log('News added to the database.')
        res.send(201)
      } else {
        console.log('Duplicate news found. Abort.')
        res.send(409)
      }
    } else {
      try {
        const parentId = ObjectID.createFromHexString(req.body.parentId)
        if (await db.collection('Data').findOne({ _id: parentId })) {
          const r = await db.collection('Data').insertOne(data)
          await db.collection('Data').updateOne(
            { _id: parentId },
            { $push: { comment_ids: r.insertedId.toHexString() } })
          console.log('Comment added to the database.')
          res.send(201)
        } else {
          console.log('Parent post not found. Abort.')
          res.send(400)
        }
      } catch (err) {
        if (req.body.parentId === null) {
          const r = await db.collection('Data').insertOne(data)
          console.log('Comment added to the database.')
          res.send(201)
        } else {
          console.log('Invalid parent ID. Abort.')
          res.send(400)
        }
      }
    }
  })
  // retreive news and comment sorted by timestamp in reversed order
  app.get('/data', async (req, res) => {
    const timeline = await db.collection('Data').find().sort({ timestamp: -1 }).toArray()
    res.json(timeline)
  })
}

main()
