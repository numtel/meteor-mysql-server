var DEBUG = false;

var startMysql = Npm.require(process.mysqlNpmPkg);

// Only start server once
if(!('mysqld' in process)) {
//   console.log('Starting MySQL...');
  process.mysqld = startMysql({ port: 3509 });

  process.mysqld.stderr.on('data', function (data) {
    DEBUG && console.log('stderr: ', data.toString());

    var ready =
      data.toString().match(/port\: (\d+)\s+MySQL Community Server \(GPL\)/);

    if(ready !== null) {
      process.mysqlServerReady = true;
      console.log('=> Started MySQL.                             ');
    }
  });
}

