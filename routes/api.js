var redis = require("redis"),
  dnode = require('dnode'),
  Runner = require('nodechecker-crawler/lib/runner'),
  npmapi = require('npm-web-api');

var redis_client = redis.createClient(7556, '127.0.0.1');


exports.test = function (req, res) {
  console.log(req.body);
  var module = req.body.module || null;
  var repo = req.body.repository || null;
  var branch = req.body.branch || null;

  var d = dnode.connect(5004, process.argv[2]);
  d.on('remote', function (remote) {
    console.log('API test request: ' + module + ' ' + repo + ' ' + branch);
    if (!repo) {
      // Without an alternative repo, this should be identical to what the
      // `nodechecker-crawler`'s `Runner` class does, so let's use that.
      npmapi.getLatest(module, function (err, packageJson) {
        new Runner(remote, packageJson, redis_client)
          .on('done', function (result) {
            // TODO(schoon) - This is the same across all three code paths, and
            // should probably be placed in a shared function.
            console.log('DONE ' + module);
            res.json(result);
          })
          .work();
      });
      return;
    }

    if(module) {
      remote.testModule(module, repo, function (result) {
        console.log('DONE ' + module);
        res.json(result);
      });
    } else {
      remote.testRepo(repo, branch, function (result) {
        console.log('DONE ' + repo);
        res.json(result);
      });
    }
  });
};

exports.stats = function (req, res) {
  redis_client.multi()
    .smembers('ok')
    .smembers('nok')
    .smembers('rfailed')
    .smembers('failed')
    .smembers('inexistent')
    .hlen('times')
    .smembers('running')
    .exec(function (err, replies) {
      res.json({
        ok: replies[0].length,
        nok: replies[1].length,
        rfailed: replies[2].length,
        failed: replies[3].length,
        inexistent: replies[4].length,
        total: replies[5],
        running: replies[6]
      });
    });
};

exports.conflicts = function (req, res) {
  redis_client.multi()
    .smembers('ok')
    .smembers('nok')
    .smembers('rfailed')
    .smembers('failed')
    .smembers('inexistent')
    .hkeys('times')
    .exec(function (err, replies) {
      var ret = [];
      for (var i = 0; i < replies[5].length; i++) {
        var aux = 0;
        var i1 = contains(replies[5][i], replies[0]);
        aux += i1;
        var i2 = contains(replies[5][i], replies[1]);
        aux += i2;
        var i3 = contains(replies[5][i], replies[2]);
        aux += i3;
        var i4 = contains(replies[5][i], replies[3]);
        aux += i4;
        var i5 = contains(replies[5][i], replies[4]);
        aux += i5;

        if(aux > 1) {
          ret.push({'module': replies[5][i], 'count': aux, 'details': [{'ok': i1}, {'nok': i2}, {'rfailed': i3}, {'failed': i4}, {'inexistent': i5}]});
        }
      };
      res.json(ret);
    });
};

function contains(obj, array) {
  for (var i = 0; i < array.length; i++) {
    if(array[i] == obj) {
      return 1;
    }
  }
  return 0;
}

exports.timedout = function (req, res) {
  redis_client.smembers('failed', function(err, members) {
    res.json(members);
  });
};

exports.tarball = function (req, res) {
  redis_client.smembers('rfailed', function(err, members) {
    res.json(members);
  });
};

exports.ok = function (req, res) {
  redis_client.smembers('ok', function(err, members) {
    res.json(members);
  });
};

exports.nok = function (req, res) {
  redis_client.smembers('nok', function(err, members) {
    res.json(members);
  });
};

exports.withouttests = function (req, res) {
  redis_client.smembers('inexistent', function(err, members) {
    res.json(members);
  });
};


exports.info = function (req, res) {
  var module = req.params.module;

  redis_client.multi()
    .sismember(['ok', module])
    .sismember(['nok', module])
    .sismember(['rfailed', module])
    .sismember(['failed', module])
    .sismember(['inexistent', module])
    .hget(['times', module])
    .hget(['output', module])
    .exec(function (err, replies) {
      var type = null;
      if(replies[0] == 1) {
        type = 'ok';
      } else if(replies[1] == 1) {
        type = 'nok';
      } else if(replies[2] == 1) {
        type = 'tarball';
      } else if(replies[3] == 1) {
        type = 'timedout';
      } else if(replies[4] == 1) {
        type = 'nottested';
      }

      res.json({'module': module, 'status': type, 'output': replies[6], 'tested': replies[5]});
    });
};

