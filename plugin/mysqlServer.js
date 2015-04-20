var DEBUG = false;

var startMysql = Npm.require(process.mysqlNpmPkg);

Plugin.registerSourceHandler('mysql.json', {
  archMatching: 'os'
}, function (compileStep) {
  var settings =
    loadJSONContent(compileStep, compileStep.read().toString('utf8'));

  // Only start server once
  if(!('mysqld' in process)) {
    process.mysqld = startMysql(settings);

    process.mysqld.stderr.on('data', process.fiberHelpers.bindEnvironment(
    function (data) {
      DEBUG && console.log('stderr: ', data.toString());

      var failure = data.toString().match(
        /Can't start server\: Bind on TCP\/IP port\: Address already in use/);

      if(failure !== null) {
        process.mysqlServerCleanedUp = true;
        console.log('[ERROR] MySQL startup failure: port in use.   ');
      }

      var ready = data.toString().match(
        /port\: (\d+)\s+MySQL Community Server \(GPL\)/);

      if(ready !== null) {
        process.mysqlServerReady = true;
        // Extra spaces for covering Meteor's status messages
        console.log('=> Started MySQL.                             ');
      }
    }));
  }
});

// Begin code borrowed from mquandalle:bower/plugin/handler.js
var loadJSONContent = function (compileStep, content) {
  try {
    return JSON.parse(content);
  }
  catch (e) {
    compileStep.error({
      message: "Syntax error in " + compileStep.inputPath,
      line: e.line,
      column: e.column
    });
  }
};
// End code from mquandalle:bower
