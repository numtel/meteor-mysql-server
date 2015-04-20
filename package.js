var Future = Npm.require('fibers/future');

Package.describe({
  name: 'numtel:mysql-server',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

function determinePlatformNpmPackage() {
  switch(process.platform + '_' + process.arch) {
    case 'linux_x64': return 'mysql-server-5.6-linux-x64';
    case 'linux_ia32': return 'mysql-server-5.6-linux-i386';
    case 'darwin_x64': return 'mysql-server-5.6-osx-x64';
    default: return null;
  }
}

process.mysqlServerCleanedUp = false;
process.mysqlServerReady = false;

process.mysqlNpmPkg = determinePlatformNpmPackage();

if(process.mysqlNpmPkg === null) {
  console.error('ERROR: Platform is not supported by numtel:mysql-server!');
  console.error('       Supports only Linux (32 and 64 bit) and OSX (64 bit)');
} else {
  var depend = {};
  depend[process.mysqlNpmPkg] = '5.6.24001';

  // Give plugin access to bindEnvironment()
  process.fiberHelpers = Npm.require('./fiber-helpers.js');

  Package.registerBuildPlugin({
    name: 'mysqlServer',
    use: [ ],
    sources: [
      'plugin/mysqlServer.js'
    ],
    npmDependencies: depend
  });
}

Npm.require('./cleanup.js').onExit(function StopMysqlServer() {
  if(process.mysqlServerCleanedUp === false && process.mysqld) {
    // Only cleanup once!
    process.mysqlServerCleanedUp = true;

    try {
      process.mysqld.stop();
    } catch(err) {
      console.log('[ERROR] Unable to stop MySQL server');
    }
  }
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.addFiles('mysql-server.js', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('numtel:mysql-server');
  api.addFiles('test.mysql.json', 'server');
  api.addFiles('mysql-server-tests.js', 'server');
});
