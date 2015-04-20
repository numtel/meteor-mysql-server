var Future = Npm.require('fibers/future');

Package.describe({
  name: 'numtel:mysql-server',
  version: '0.0.3',
  summary: 'Run MySQL server inside your Meteor app',
  git: 'https://github.com/numtel/meteor-mysql-server',
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

// Force Meteor to recognize that this package has binary deps
// bcrypt is an npm package that
// has different binaries for differnet architectures.
Npm.depends({
  bcrypt: '0.8.2'
});

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
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('numtel:mysql-server');
  api.use('numtel:mysql@0.1.7');

  api.addFiles('test.mysql.json', 'server');
  api.addFiles('mysql-server-tests.js', 'server');
});
