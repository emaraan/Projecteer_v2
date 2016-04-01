﻿// require all node modules pulled from dependencies and store them in variables
var express = require('express'); 
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mailer = require('express-mailer');
var Pusher = require('pusher');

// require routes modules defined in routes directory
var index = require('./routes/index');
var account = require('./routes/account');
var project = require('./routes/project');

var app = express();

// require socket.io dependency
var server = require('http').Server(app);
var io = require('socket.io')(server);

// load env variables from .env file
dotenv.load();

// setup for emails
mailer.extend(app, {
    from: 'ProjecteerOriginAcademy@gmail.com',
    host: 'smtp.gmail.com', // hostname
    secureConnection: false, // true if you use SMTPS
    port: 587,
    transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
    auth: {
        user: 'ProjecteerOriginAcademy@gmail.com',
        pass: process.env.PASSWD
    }
});

// view engine setup (not being used)
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Connect to the Mongo database, whether locally or on Mongolab
var local_database_name = 'projecteer';
var local_database_uri = 'mongodb://localhost/' + local_database_name;

// Connects to mongolab server if it exists, otherwise connect to local mongo instance
var database_uri = process.env.MONGODB_CONNECTION_URL || local_database_uri; 

// Check if mongoose connected and if not, throw error
mongoose.connect(database_uri);
var db = module.exports = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', function (callback) {
    console.log("Connected to server database");
});

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(require('express-session')({
    secret: process.env.SECRET,
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: { maxAge: 900000 } // session expires in 10 minutes
}));
app.use(cookieParser(process.env.SECRET));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
//app.use(require('stylus').middleware(path.join(__dirname, 'public')));

// serve public static code
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'app')));

io.on('connection', function(socket) {
    console.log('new connection', socket);

    socket.on('add-customer', function(customer) {
        io.emit('notification', {
            message: 'new customer',
            customer: customer
        });
    });
});

// use the routes we defined in the routes directory
app.use('/', index);
app.use('/account', account);
app.use('/project', project);

/*app.post("/email", function(req, res, next) {

    app.mailer.send({
        template: 'email' // REQUIRED 
        }, {
            to: 'kanehchong@gmail.com', // REQUIRED. This can be a comma delimited string just like a normal email to field.  
            subject: 'Someone sent you an email from your website!', // REQUIRED. 
            message: { text: "HELLOOO" } // All additional properties are also passed to the template as local variables. 
        }, function (err) {
        if (err) {
            // handle error 
            console.log(err);
            res.send('There was an error sending the email');
            return;
        }

        res.status(200).send({});
    });

});*/

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// All other routes should redirect to the index.html
app.route('/*').get((req, res) => {
    res.sendFile(path.resolve('./public/app/index.html'));
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;