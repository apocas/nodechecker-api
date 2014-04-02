require('colors');

var MongoClient = require('mongodb').MongoClient,
  DuplexEmitter = require('duplex-emitter'),
  reconnect     = require('reconnect'),
  format = require('util').format;

var mongo_ip = process.env.MONGODB_HOST || '127.0.0.1';
var mongo_port = process.env.MONGODB_PORT || 27017;
var remote, mdb, mcollection, rcollection;

MongoClient.connect(format("mongodb://%s:%s/nodechecker", mongo_ip, mongo_port), function(err, db) {
  if(err) throw err;

  mdb = db;

  mcollection = mdb.collection('modules');
  rcollection = mdb.collection('runs');

  reconnect(function (socket) {
    console.log('Connected to dispatcher'.green);
    remote = DuplexEmitter(socket);

    remote.on('done', function(data) {
      res.json(data.result);
      socket.end();
    });
  }).connect(process.env.BALANCER_PORT || 5000, process.env.BALANCER_HOST || '127.0.0.1');
});


exports.test = function (req, res) {
  console.log(req.body);
  var module = req.body.module || null;
  var repo = req.body.repository || null;
  var branch = req.body.branch || null;

  console.log('API test request: ' + module + ' ' + repo + ' ' + branch);
  if(module) {
    remote.emit('test', {'module': module, 'repository': repo});
  } else {
    remote.emit('test', {'repository': repo, 'branch': branch});
  }
};

exports.stats = function (req, res) {
  mcollection.group(['status'], {}, {count: 0}, function reduce(record, memo) {
    memo.count++;
  }, function(err, items){
    var result = {};
    for (var i = items.length - 1; i >= 0; i--) {
      result['' + items[i].status] = items[i].count;
    }
    res.json(result);
  });
};

exports.timedout = function (req, res) {
  mcollection.find({status: 'timedout'},{name: 1, _id: 0}).toArray(function(err, docs) {
    res.json(docs);
  });
};

exports.failed = function (req, res) {
  mcollection.find({status: 'failed'},{name: 1, _id: 0}).toArray(function(err, docs) {
    res.json(docs);
  });
};

exports.ok = function (req, res) {
  mcollection.find({status: 'ok'},{name: 1, _id: 0}).toArray(function(err, docs) {
    res.json(docs);
  });
};

exports.nok = function (req, res) {
  mcollection.find({status: 'nok'},{name: 1, _id: 0}).toArray(function(err, docs) {
    res.json(docs);
  });
};

exports.withouttests = function (req, res) {
  mcollection.find({status: 'nottested'},{name: 1, _id: 0}).toArray(function(err, docs) {
    res.json(docs);
  });
};

exports.info = function (req, res) {
  var module = req.params.module;

  mcollection.findOne({name: module}, function(err, doc) {
    if(doc) {
      var deps = doc.dependencies;
      if(deps) {
        for(var i = 0; i< deps.length; i++) {
          deps[i] = deps[i].split('\uff0E').join('.');
        }
      }

      rcollection.find({module: module}).sort({_id: -1}).limit(3).toArray(function(err, docs) {
        res.json({'module': module, 'status': doc.status, 'dependencies': deps, 'runs': docs});
      });
    } else {
      res.json({});
    }
  });
};
