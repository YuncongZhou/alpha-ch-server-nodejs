const express = require('express')
const app = express()

// // this middleware will not allow the request to go beyond it
// app.use(function(req, res) {
//   res.send('Hello World');
// });

app.get('/user/:id',function (req, res) {
  res.send('Hello user '+req.params.id+'.')
})

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.get('/hello',function(req, res) {
    res.send('hahaha')
})

app.post('/post', function (req, res) {
  res.send('Got a POST request')
})

app.put('/user', function (req, res) {
  res.send('Got a PUT request at /user')
})

app.delete('/user', function (req, res) {
  res.send('Got a DELETE request at /user')
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

//test
console.log('test');
