Package.describe({
  name: 'numtel:mysql-server',
  version: '1.0.1',
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

var npmPkg = determinePlatformNpmPackage();

if(npmPkg === null) {
  console.error('ERROR: Platform is not supported by numtel:mysql-server!');
  console.error('       Supports only Linux (32 and 64 bit) and OSX (64 bit)');
} else {
  var depend = {
    // shelljs for copying and creating data directories
    shelljs: '0.4.0',
    // mysql for initialization queries
    mysql: '2.8.0'
  };
  // platform dependent mysql-server-xxx package
  depend[npmPkg] = '5.6.24002';

  Package.registerBuildPlugin({
    name: 'mysqlServer',
    use: [ 'underscore@1.0.3' ],
    sources: [
      'plugin/mysqlServer.js'
    ],
    npmDependencies: depend
  });
}

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
