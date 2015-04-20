var DEBUG = false;

var startMysql = Npm.require(process.mysqlNpmPkg);

// Only start server once
if(!('mysqld' in process)) {
  process.mysqld = startMysql({ port: 3509 });

  process.mysqld.stderr.on('data', function (data) {
    DEBUG && console.log('stderr: ', data.toString());

    var failure = data.toString().match(
      /Can't start server\: Bind on TCP\/IP port\: Address already in use/);

    if(failure !== null) {
      process.mysqlServerCleanedUp = true;
      // Extra spaces for covering Meteor's status messages
      console.log('=> MySQL startup failure: port in use.        ');
    }

    var ready = data.toString().match(
      /port\: (\d+)\s+MySQL Community Server \(GPL\)/);

    if(ready !== null) {
      process.mysqlServerReady = true;
      // Extra spaces for covering Meteor's status messages
      console.log('=> Started MySQL.                             ');
    }
  });
}

