# numtel:mysql-server

Package to run MySQL server inside your Meteor app

## Installation

Add this package to your application to embed a MySQL server:

```
meteor add numtel:mysql-server
```

A settings file must be created with the extension of `.mysql.json` in your application. A file name like `myapp.mysql.json` is valid.

See [`test.mysql.json`](test.mysql.json) for an example. Settings are used to build the `my.cnf` file. Specifying a port is recommended.

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
