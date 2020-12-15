var http = require('http');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var MongoStore = require('connect-mongo')(session);

// Load environment params
const dotenv = require('dotenv');
dotenv.config();

var app = express();

app.locals.pretty = true;
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(__dirname + '/static'));

// build mongo database connection url
process.env.MONGO_HOST = process.env.MONGO_HOST || 'localhost'
process.env.MONGO_PORT = process.env.MONGO_PORT || 27017;
process.env.MONGO_NAME = process.env.MONGO_NAME || 'node-login';

if (app.get('env') != 'live'){
	process.env.MONGO_URL = 'mongodb://'+process.env.MONGO_HOST+':'+process.env.MONGO_PORT;
}	else {
// prepend url with authentication credentials // 
	process.env.MONGO_URL = 'mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PASS+'@'+process.env.MONGO_HOST+':'+process.env.MONGO_PORT;
}

app.use(session({
	secret: 'faeb4453e5d14fe6f6d04637f78077c76c73d1b4',
	proxy: true,
	resave: true,
	saveUninitialized: true,
	store: new MongoStore({ url: process.env.MONGO_URL })
	})
);

require('./app/server/routes')(app);

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

