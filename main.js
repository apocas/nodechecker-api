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

app.get('/stats/timedout', api.timedout);
app.get('/stats/tarball', api.tarball);
app.get('/stats/ok', api.ok);
app.get('/stats/nok', api.nok);
app.get('/stats/withouttests', api.withouttests);
app.get('/stats/conflicts', api.conflicts);

app.get('/info/:module', api.info);

var port = process.env.PORT || 3201;
console.log('Listening on ' + port);

app.listen(port);