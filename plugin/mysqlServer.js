var DEBUG = false;

var path = Npm.require('path');

var mysqld;
var cleanedUp = false;
var serverReady = false;

// With the mysql-server-xxx NPM dependency, cannot simply require files from
//  meteor/tools directory because the Npm.require root directory has changed
var toolDir = path.dirname(process.mainModule.filename);
// Must correspond to name provided in package.js registerBuildPlugin
var pluginNpmDir =
  path.join(process.cwd(), '.npm/plugin/mysqlServer/node_modules');
// Determine path relative to file system root "/"
var rootRelPath =
  pluginNpmDir.split('/').map(function() { return '..' }).join('/').slice(3);
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

  // Start server, but only once
  if(!mysqld) {
    mysqld = startMysql(settings);

    mysqld.stderr.on('data', fiberHelpers.bindEnvironment(
    function (data) {
      DEBUG && console.log('stderr: ', data.toString());

      var failure = data.toString().match(
        /Can't start server\: Bind on TCP\/IP port\: Address already in use/);

      if(failure !== null) {
        cleanedUp = true;
        console.log('[ERROR] MySQL startup failure: port in use.   ');
      }

      var ready = data.toString().match(
        /port\: (\d+)\s+MySQL Community Server \(GPL\)/);

      if(ready !== null) {
        serverReady = true;
        // Extra spaces for covering Meteor's status messages
        console.log('=> Started MySQL.                             ');
      }
    }));
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
