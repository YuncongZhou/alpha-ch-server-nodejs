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

const z = 2  // choose 2 sigma to guarantee 97.7% accuracy
const calculateWilsonScore = (upvote, downvote, zScore = z) => {
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
    await db.collection('posts').aggregate(
      [
        { $match: { _id: id } },
        {
          $project: {
            wilson_score: {
              $multiply: [
                { $divide: [1, { $add: [1, { $divide: [{ $pow: [z, 2] }, { $add: ['$upvote', '$downvote'] }] }] }] },
                {
                  $add: [
                    { $divide: ['$upvote', { $add: ['$upvote', '$downvote'] }] },
                    {
                      $subtract: [
                        { $divide: [{ $pow: [z, 2] }, { $multiply: [2, { $add: ['$upvote', '$downvote'] }] }] },
                        {
                          $multiply: [
                            z,
                            {
                              $sqrt: {
                                $add: [
                                  {
                                    $multiply: [
                                      {
                                        $divide: [
                                          { $divide: ['$upvote', { $add: ['$upvote', '$downvote'] }] },
                                          { $add: ['$upvote', '$downvote'] },
                                        ],
                                      },
                                      { $subtract: [1, { $divide: ['$upvote', { $add: ['$upvote', '$downvote'] }] }] },
                                    ],
                                  },
                                  {
                                    $divide: [
                                      { $pow: [z, 2] },
                                      { $multiply: [4, { $pow: [{ $add: ['$upvote', '$downvote'] }, 2] }] },
                                    ],
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      (err, res) => {
        db.collection('posts').updateOne({ _id: id }, { $set: { wilson_score: res[0].wilson_score } })
        console.log(res[0].wilson_score)
      },
    )
    const post = await db.collection('posts').findOne({ _id: id })
    const wilsonScore = calculateWilsonScore(post.upvote, post.downvote)
    console.log(wilsonScore)
    res.status(201).send(post)
  })
  // retreive news and comment sorted by timestamp in reversed order
  app.get('/posts', async (req, res) => {
    const timeline = await db.collection('posts').find().sort({ timestamp: -1 }).toArray()
    res.json(timeline)
  })
}

main()
