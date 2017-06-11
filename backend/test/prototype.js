const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json())  

const MongoClient = require('mongodb').MongoClient
const url = "mongodb://puru:19880818@ds155201.mlab.com:55201/test_new_mongodb"

app.listen(3000, () => console.log('Listening to port 3000'))
app.get('/user/:id', (req, res) => res.send(`Welcome to the homepage of user ${req.params.id}.`))

MongoClient.connect(url, function(err, db){  //it shows that the complexity of this block is 5, and it need some work on performance improvement
    if(err) throw err
    app.post('/post', function(req, res){
        const data = req.body
        console.log(data)
        db.collection('News', (err, collection) => collection.insert(data))
        res.send(`Success`)
    }) 
})
