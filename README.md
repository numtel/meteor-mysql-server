# numtel:mysql-server [![Build Status](https://travis-ci.org/numtel/meteor-mysql-server.svg?branch=master)](https://travis-ci.org/numtel/meteor-mysql-server)

Package to run MySQL server inside your Meteor app

> **Version 1.0.0 breaking change:** Default data directory has now changed. If you do not specify a data directory in your `.mysql.json` file, you will need to now specify the old default data directory in order to migrate successfully without losing your current databases (or move your data directory to the new default location, see "Configuring the server" section below). Set the `datadir` key to `.meteor/mysqldb` to maintain the old default data directory.

## Installation

> Currently only supports Linux (32 and 64 bit) and Mac OSX (64 bit). Windows support is expected in the near future.

Add this package to your application to embed a MySQL server:

```
meteor add numtel:mysql-server
```

### Configuring the server

A settings file must be created with the extension of `.mysql.json` in your application. A file name like `myapp.mysql.json` is valid.

If a `datadir` setting is not specified, the MySQL data will default to your application's `.meteor/local/mysqldb` directory. The `meteor reset` command will clear the application's database. The directory will be created if it does not exist.

When specifying a `datadir` setting, the path is relative to your application root.

The binary log directory will be set as `binlog` child to the `datadir`. This directory may be excluded from your source code repository or cleared to free space. It is not necessary to manually specify the `log_bin` setting.

#### Initialization queries

In your `.mysql.json` file, you may specify a filename containing queries to perform on first installation of the database under the `initialize` key. These queries will be executed if the data directory is created when the Meteor application is started.

In this array, it may be useful to create the application's database and user.

#### Example configuration

See [`test.mysql.json`](test.mysql.json) for an example. Except for the `initialize` queries, all other settings are used to build the `my.cnf` file. Specifying a port is recommended.

Default settings provide the binary log in row mode, requiring no extra configuration to use the [`numtel:mysql` package](https://github.com/numtel/meteor-mysql). To view the default settings, see [`index.js` in the underlying NPM package](https://github.com/numtel/mysql-server-5.6-linux-x64/blob/master/index.js).

## Usage

With the start of you Meteor application, you will notice a new line output to the console:

```
=> Started MySQL.
```

The MySQL server is started on the local machine and may be used with the `numtel:mysql` package by using the following configuration settings:

```javascript
var liveDb = new LiveMysql({
  host: 'localhost',
  port: 3509, // As specified in your .mysql.json file
  user: 'root', // Default master user
  password: '', // Default master password
  serverId: 134, // Specify any value other than the server's value (default 1)
  minInterval: 200 // Optional minimum query refresh interval (ms)
});
```

## Resources

* [`numtel:mysql` - Reactive MySQL for Meteor](https://github.com/numtel/meteor-mysql)
* [Leaderboard example modified to use MySQL](https://github.com/numtel/meteor-mysql-leaderboard)

## License

MIT
