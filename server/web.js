var coffee_script = require('coffee-script');
var express = require('express');

var app = express.createServer(express.logger());

app.configure(function(){
  app.use(app.router);
})

app.get('/', function(request, response) {
  response.send("<h1>BCTP Server</h1><p>POST with code in the body, we'll respond with JavaScript</p><p>Berg, Nasser, 2012</p>")
});  

app.post('/', function(request, response) {
  var body = "";

  request.setEncoding('utf8');

  request.on('data', function(raw) { body += raw; });
  request.on('end', function(raw) {
    var js = coffee_script.compile(body);
    
    response.setHeader("Content-Type", "text/coffeescript");
    response.send(js);
  });
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});