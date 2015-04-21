var DEBUG = false;
var MYSQLD_STARTUP_TIMEOUT = 10000;

var path = Npm.require('path');
var fs = Npm.require('fs');
var shelljs = Npm.require('shelljs');
var Future = Npm.require('fibers/future');

var mysqld;
var cleanedUp = false;
var serverReady = false;

// With the mysql-server-xxx NPM dependency, cannot simply require files from
//  meteor/tools directory because the Npm.require root directory has changed
var toolDir = path.dirname(process.mainModule.filename);
// Assume never more than 100 directories deep
var rootRelPath = _.range(100).map(function() { return '..' }).join('/');
// Determine meteor/tools relative directory path
var relToolDir = path.join(rootRelPath, toolDir);

// For bindEnvironment()
var fiberHelpers = Npm.require(path.join(relToolDir, 'fiber-helpers.js'));

var npmPkg = determinePlatformNpmPackage();
// Should not happen as package.js should have filtered already
if(npmPkg === null) return;

// Load mysql-server-xxx NPM package
var startMysql = Npm.require(npmPkg);

// Read settings from somefile.mysql.json
Plugin.registerSourceHandler('mysql.json', {
  archMatching: 'os'
}, function (compileStep) {
  var settings =
    loadJSONContent(compileStep, compileStep.read().toString('utf8'));

  // Paths inside the application directory where database is to be stored
  var dataDir = settings.datadir || '.meteor/mysqldb';
  var dataDirPath = path.join(process.cwd(), dataDir, 'mysql');
  var binlogDir = path.join(dataDir, 'binlog');
  var binlogDirPath = path.join(process.cwd(), binlogDir, 'mysql-bin.log');
  // Path where initial data comes from
  var initDataPath = path.join(startMysql.pkgdir(), 'server/data');
  var initBinlogPath = path.join(initDataPath, '../binlog');

  // Replace datadir value with updated path inside application directory
  settings.datadir = dataDirPath;
  settings.log_bin = binlogDirPath;

  // Initialize data directory if does not exists
  try {
    var dataDirStat = fs.statSync(dataDir)
  } catch(err) {
    // Directory does not exist, create it and copy initial data
    shelljs.mkdir('-p', dataDir);
    shelljs.cp('-R', initDataPath + '/*', dataDir);
  }

  if(dataDirStat && !dataDirStat.isDirectory()) {
    // Name is occupied by file, cannot use this path as database directory
    console.log('[ERROR] MySQL data directory unavailable.     ');
    return;
  }

  // Recreate binlog directory if deleted (potentially to save space for transfer)
  try {
    var binlogDirStat = fs.statSync(binlogDir)
  } catch(err) {
    // Directory does not exist, create it and copy initial data
    shelljs.mkdir('-p', binlogDir);
    shelljs.cp('-R', initBinlogPath + '/*', binlogDir);
  }

  // Start server, but only once, wait for it to be ready (or not)
  if(!mysqld) {
    var fut = new Future;
    mysqld = startMysql(settings);

    // After preset timeout, give up waiting for MySQL to start or fail
    setTimeout(fiberHelpers.bindEnvironment(function() {
      if(!fut.isResolved()) {
        console.log('[ERROR] MySQL startup timeout!                ');
        fut['return']();
      }
    }), MYSQLD_STARTUP_TIMEOUT);

    mysqld.stderr.on('data', fiberHelpers.bindEnvironment(
    function (data) {
      // Data never used as Buffer
      data = data.toString();
      DEBUG && console.log('stderr: ', data);

      // No need to check more if server started already
      if(fut.isResolved()) return;

      // Check for any known errors
      var errors = [
        /Can't start server\: Bind on TCP\/IP port\: Address already in use/,
        /Can't change dir to .+ \(Errcode\: 2 - No such file or directory\)/,
        /Fatal error\: .+/
      ];

      for(var i = 0; i < errors.length; i++) {
        var failure = data.match(errors[i]);
        if(failure !== null) {
          cleanedUp = true;
          console.log('[ERROR] ' + failure[0]);
          return fut['return']();
        }
      }

      var ready = data.match(
        /port\: (\d+)\s+MySQL Community Server \(GPL\)/);

      if(ready !== null) {
        serverReady = true;
        // Extra spaces for covering Meteor's status messages
        console.log('=> Started MySQL.                             ');
        fut['return']();
      }
    }));

    return fut.wait();
  }

});

// Stop MySQL server on Meteor exit
Npm.require(path.join(relToolDir, 'cleanup.js')).onExit(
function StopMysqlServer() {
  if(cleanedUp === false && mysqld) {
    // Only cleanup once!
    cleanedUp = true;

    try {
      mysqld.stop();
    } catch(err) {
      console.log('[ERROR] Unable to stop MySQL server');
    }
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
