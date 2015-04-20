var DEBUG = false;

var npmPkg = determinePlatformNpmPackage();
// Should not happen as package.js should have filtered already
if(npmPkg === null) return;

var startMysql = Npm.require(npmPkg);

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

function determinePlatformNpmPackage() {
  switch(process.platform + '_' + process.arch) {
    case 'linux_x64': return 'mysql-server-5.6-linux-x64';
    case 'linux_ia32': return 'mysql-server-5.6-linux-i386';
    case 'darwin_x64': return 'mysql-server-5.6-osx-x64';
    default: return null;
  }
}


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
