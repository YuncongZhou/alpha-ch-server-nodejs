const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const app = express()
app.use(bodyParser.json())

const url = process.env.URL

app.listen(3000, () => console.log('Listening to port 3000'))
app.get('/user/:id', (req, res) => res.send(`Welcome to the homepage of user ${req.params.id}.`))

const createPost = (req, type) => {
  const post = {}
  switch (type) {
    case 0:
      post.title = req.body.title
      post.url = req.body.url
      break
    case 1:
      post.title = req.body.title
      post.body = req.body.body
      break
    case 2:
      post.body = req.body.body
      post.parent_id = req.body.parentId
      break
    default:
  }
  post.type = req.body.type
  post.timestamp = new Date()
  post.child_ids = []
  post.upvote = 0
  post.downvote = 0
  return post
}

const main = async () => {
  const db = await MongoClient.connect(url)
  // post case 0: news , case 1: top-level comment, case 2: non top-level comment
  app.post('/posts', async (req, res) => {
    switch (req.body.type) {
      case 0: {
        const duplicate = await db.collection('posts').findOne({ url: req.body.url })
        if (!duplicate) {
          const post = createPost(req, req.body.type)
          const r = await db.collection('posts').insertOne(post)
          const id = r.insertedId.toHexString()
          res.status(201).send({ postId: id })
        } else {
          res.status(409).send({ postId: duplicate._id.toHexString() })
        }
        break
      }
      case 1: {
        const post = createPost(req, req.body.type)
        const r = await db.collection('posts').insertOne(post)
        const id = r.insertedId.toHexString()
        res.status(201).send({ postId: id })
        break
      }
      case 2: {
        try {
          const parentId = ObjectID.createFromHexString(req.body.parentId)
          if (await db.collection('posts').findOne({ _id: parentId })) {
            const post = createPost(req, req.body.type)
            const r = await db.collection('posts').insertOne(post)
            const id = r.insertedId.toHexString()
            await db.collection('posts').updateOne(
              { _id: parentId },
              { $push: { child_ids: id } })
            res.status(201).send({ postId: id })
          } else {
            res.sendStatus(400)
          }
        } catch (err) {
          res.sendStatus(400)
        }
        break
      }
      default:
        res.sendStatus(400)
    }
  })
  // retreive news and comment sorted by timestamp in reversed order
  app.get('/posts', async (req, res) => {
    const timeline = await db.collection('posts').find().sort({ timestamp: -1 }).toArray()
    res.json(timeline)
  })
}

main()
