const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// app.use(bodyParser.json())  //this would trigger an error in library

app.listen(3000, () => console.log('Listening to port 3000'))
app.get('/user/:id', (req, res) => res.send(`Welcome to the homepage of user ${req.params.id}.`))
app.put('/post', (req, res) => console.log(req.body) ) //this doesn't work! just return undefined
