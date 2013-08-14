var express = require('express'),
  api     = require('./routes/api');

var app = express();

app.configure(function(){
  this.use(express.errorHandler({dumpException: true, showStack: true}));
});

app.configure(function(){
  this.use(app.router);
});


app.get('/stats', api.stats);

app.get('/api/timedout', api.timedout);
app.get('/api/tarball', api.tarball);
app.get('/api/ok', api.ok);
app.get('/api/nok', api.nok);
app.get('/api/withouttests', api.withouttests);
app.get('/api/conflicts', api.conflicts);
app.get('/api/info/:module', api.info);

var port = process.env.PORT || 3201;
console.log("Listening on " + port);

app.listen(port);