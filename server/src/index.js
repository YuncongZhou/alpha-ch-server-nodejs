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
        res.status(201).json({ success: true })
      } else {
        console.log('Duplicate news found. Abort.')
        res.status(409).json({ success: false })
      }
    } else {
      const re = /[0-9a-f]{24}/
      if (!(req.body.parent_id.length === 24 && re.test(req.body.parent_id))) {
        console.log('Invalid parent id found. Abort.')
        res.status(409).json({ success: false })
      } else {
        const parentId = ObjectID.createFromHexString(req.body.parent_id)
        if (await db.collection('Data').findOne({ _id: parentId })) {
          const r = await db.collection('Data').insertOne(data)
          await db.collection('Data').updateOne(
            { _id: parentId },
            { $push: { comment_ids: r.insertedId.toHexString() } },
            (err, result) => {
              if (err) {
                console.log('A error occurred while appending comment id')
              }
            })
          console.log('Comment added to the database.')
          res.status(201).json({ success: true })
        } else {
          console.log('Parent post not found. Abort.')
          res.status(409).json({ success: false })
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