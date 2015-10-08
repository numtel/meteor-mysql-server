var DEBUG = false;
var MYSQLD_STARTUP_TIMEOUT = 10000;

// In Meteor 1.2, the paths to the required tool files has changed,
// if an error occurs loading the file, try the next set.
var TOOL_PATHS = [
  {
    // Meteor < 1.2
    fiberHelpers: 'fiber-helpers.js',
    cleanup: 'cleanup.js'
  },
  {
    // Meteor >= 1.2
    fiberHelpers: 'utils/fiber-helpers.js',
    cleanup: 'tool-env/cleanup.js'
  }
];

var path = Npm.require('path');
var fs = Npm.require('fs');
var shelljs = Npm.require('shelljs');
var Future = Npm.require('fibers/future');
var mysql = Npm.require('mysql');

var mysqld;
var cleanedUp = false;
var serverReady = false;

function loadMeteorTool(whichTool, index) {
  var dependency;
  index = index || 0;
  try {
    dependency = Npm.require(path.join(relToolDir, TOOL_PATHS[index][whichTool]));
  } catch (err) {
    dependency = loadMeteorTool(whichTool, index + 1);
  }
  return dependency;
}

// With the mysql-server-xxx NPM dependency, cannot simply require files from
//  meteor/tools directory because the Npm.require root directory has changed
var toolDir = path.dirname(process.mainModule.filename);
// Assume never more than 100 directories deep
var rootRelPath = _.range(100).map(function() { return '..' }).join('/');
// Determine meteor/tools relative directory path
var relToolDir = path.join(rootRelPath, toolDir);

// For bindEnvironment()
var fiberHelpers = loadMeteorTool('fiberHelpers');
var MBE = fiberHelpers.bindEnvironment;

var npmPkg = determinePlatformNpmPackage();
// Should not happen as package.js should have filtered already
if(npmPkg === null) return;

// Load mysql-server-xxx NPM package
var startMysql = Npm.require(npmPkg);

var initializeServer = false;

// Read settings from somefile.mysql.json
Plugin.registerSourceHandler('mysql.json', {
  archMatching: 'os'
}, function (compileStep) {
  var settings =
    loadJSONContent(compileStep, compileStep.read().toString('utf8'));

  if(settings.initialize) {
    var initQueries =
      fs.readFileSync(path.join(process.cwd(), settings.initialize)).toString();
    delete settings.initialize;
  }

  // Paths inside the application directory where database is to be stored
  var dataDir = settings.datadir || '.meteor/local/mysqldb';
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
    initializeServer = true;
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
    setTimeout(MBE(function() {
      if(!fut.isResolved()) {
        console.log('[ERROR] MySQL startup timeout!                ');
        fut['return']();
      }
    }), MYSQLD_STARTUP_TIMEOUT);

    mysqld.stderr.on('data', MBE(function (data) {
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

        if(initializeServer && initQueries) {
          // Perform initialization queries on new server installation
          var db = mysql.createConnection({
            host: 'localhost',
            port: settings.port || 3306,
            user: 'root',
            password: '',
            multipleStatements: true
          });

          db.connect(MBE(function(error) {
            if(error) return fut['throw'](error);
            console.log('[MySQL] Performing initialization queries...  ');
            db.query(initQueries, MBE(function(error, rows) {
              if(error) return fut['throw'](error);
              db.destroy(); // Close connection
              return fut['return']();
            }));
          }));
        } else {
          fut['return']();
        }
      }
    }));

    return fut.wait();
  }

});

// Stop MySQL server on Meteor exit
loadMeteorTool('cleanup').onExit(function StopMysqlServer() {
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
