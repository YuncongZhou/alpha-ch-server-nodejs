const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const app = express()
app.use(bodyParser.json())

const url = process.env.URL

// eslint-disable-next-line no-console
app.listen(3000, () => console.log('Listening to port 3000'))
app.get('/user/:id', (req, res) => res.send(`Welcome to the homepage of user ${req.params.id}.`))

const calculateWilsonScore = (upvote, downvote, zScore = 2) => {
  const total = upvote + downvote
  if (total <= 0 || upvote < 0 || downvote < 0) return 0
  const p = upvote / total
  const zSqare = Math.pow(zScore, 2)
  return (
    (p + zSqare / (2 * total) - zScore * Math.sqrt((p * (1 - p) + zSqare / (4 * total)) / total)) / (1 + zSqare / total)
  )
}

const createPost = body => {
  const post = {}
  switch (body.type) {
    case 0:
      post.title = body.title
      post.url = body.url
      break
    case 1:
      post.title = body.title
      post.body = body.body
      break
    case 2:
      post.body = body.body
      post.parent_id = body.parentId
      break
    default:
  }
  post.type = body.type
  post.timestamp = new Date()
  post.child_ids = []
  post.upvote = 0
  post.downvote = 0
  post.wilson_score = 0
  return post
}

const main = async () => {
  const db = await MongoClient.connect(url)
  // post case 0: news , case 1: top-level comment, case 2: non top-level comment
  app.post('/posts', async (req, res) => {
    let parentId
    switch (req.body.type) {
      case 0: {
        const duplicate = await db.collection('posts').findOne({ url: req.body.url })
        if (duplicate) {
          res.status(409).send({ postId: duplicate._id.toHexString() })
          return
        }
        break
      }
      case 1:
        break
      case 2:
        try {
          parentId = ObjectID.createFromHexString(req.body.parentId)
        } catch (err) {
          res.status(400).end()
          return
        }
        if (!await db.collection('posts').findOne({ _id: parentId })) {
          res.status(400).end()
          return
        }
        break
      default:
        res.status(400).end()
        return
    }
    const post = createPost(req.body)
    const r = await db.collection('posts').insertOne(post)
    const id = r.insertedId.toHexString()
    if (parentId) {
      await db.collection('posts').updateOne({ _id: parentId }, { $push: { child_ids: id } })
    }
    res.status(201).send({ postId: id })
  })
  //vote posts
  app.put('/votes/:id', async (req, res) => {
    let id, direction
    try {
      id = ObjectID.createFromHexString(req.params.id)
    } catch (err) {
      res.status(400).end()
      return
    }
    switch (req.body.direction) {
      case 0:
        direction = 'downvote'
        break
      case 1:
        direction = 'upvote'
        break
      default:
        res.status(400).end()
        return
    }
    await db.collection('posts').updateOne({ _id: id }, { $inc: { [direction]: 1 } })
    let post = await db.collection('posts').findOne({ _id: id })
    const wilsonScore = calculateWilsonScore(post.upvote, post.downvote)
    await db.collection('posts').updateOne({ _id: id }, { $set: { wilson_score: wilsonScore } })
    post = await db.collection('posts').findOne({ _id: id })
    res.status(201).send(post)
  })
  // retreive news and comment sorted by wilson score or timestamp in reversed order
  app.get('/posts', async (req, res) => {
    let list
    switch (req.query.sortBy || 'score') {
      case 'score':
        list = await db.collection('posts').find().sort({ wilson_score: -1 }).toArray()
        res.json(list)
        break
      case 'time':
        list = await db.collection('posts').find().sort({ timestamp: -1 }).toArray()
        res.json(list)
        break
      case 'downvote':
        list = await db.collection('posts').find().sort({ downvote: -1 }).toArray()
        res.json(list)
        break
      default:
        res.status(400).end()
    }
  })
}

main()
