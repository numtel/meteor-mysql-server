var PREFIX = 'numtel:mysql-server - ';

var liveDb = new LiveMysql({
  host: 'localhost',
  port: 3509, // Keep in sync with test.mysql.json
  user: 'root',
  password: '',
  database: 'meteor_server_test',
  serverId: 134,
  minInterval: 200
});

Tinytest.addAsync(PREFIX + 'Simple Query', function (test, done) {
  liveDb.db.query('SELECT 1+1 AS result', Meteor.bindEnvironment(
  function(error, rows) {
    test.equal(rows[0].result, 2);
    done();
  }));
});

Tinytest.addAsync(PREFIX + 'Initialization Queries', function(test, done) {
  liveDb.db.query('SELECT * FROM test_table', Meteor.bindEnvironment(
  function(error, rows) {
    test.equal(rows[0].col, 25);
    done();
  }));
});
