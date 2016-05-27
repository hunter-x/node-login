
/**
	* Node.js Login Boilerplate
	* More Info : http://kitchen.braitsch.io/building-a-login-system-in-node-js-and-mongodb/
	* Copyright (c) 2013-2016 Stephen Braitsch
	* Copyright (c)2016 Abderrahmen Gharsalllah
**/

var http = require('http');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var cookieParser = require('cookie-parser');
//var MongoStore = require('connect-mongo')(session);
var rdbStore 	 = require('express-session-rethinkdb')(session);
var dbConfig 	 = require('./app/server/config').dbConfig;
var appconf 	 = require('./app/server/config').appconf;


var app = express();

app.locals.pretty = true;
app.set('port', appconf.port);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'jade');
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
app.use(express.static(__dirname + '/app/public'));

// build mongo rethinkdb database connection url //

/*var dbURL = 'mongodb://'+dbHost+':'+dbPort+'/'+dbName;
if (app.get('env') == 'live'){
// prepend url with authentication credentials // 
	dbURL = 'mongodb://'+process.env.DB_USER+':'+process.env.DB_PASS+'@'+dbHost+':'+dbPort+'/'+dbName;
}*/

var rdbStore = new RDBStore({
  connectOptions: {
    servers: [
      { host: dbConfig.host, port: dbConfig.port }
    ],
    db: dbConfig.dbName,
    discovery: false,
    pool: false,
    buffer: 50,
    max: 1000,
    timeout: 20,
    timeoutError: 1000
  },
  table: 'session',
  sessionTimeout: 86400000,
  flushInterval: 60000,
  debug: true
});

app.use(session({
	secret: 'faeb4453e5d14fe6f6d04637f78077c76c73d1b4',
	proxy: true,
	resave: true,
	saveUninitialized: true,
	//store: new MongoStore({ url: dbURL })
	store: rdbStore
	})
);

require('./app/server/routes')(app);

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});
