var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');

var crypto = require('crypto');
var bcrypt = require('bcryptjs');
var mongoose = require('mongoose');
var jwt = require('jwt-simple');
var moment = require('moment');

var async = require('async');
var request = require('request');
var xml2js = require('xml2js');
var uniqueValidator = require('mongoose-unique-validator');

var agenda = require('agenda')({
    db: {
        address: 'localhost:27017/test'
    }
});
var sugar = require('sugar');
var nodemailer = require('nodemailer');
var _ = require('lodash');

//grabed files
var routes = require('./routes/index');
var config = require('./config'); // get our config file
var User = require('./models/users'); // get our mongoose model
var Show = require('./models/post'); // get our mongoose model
var Comments = require('./models/comments'); // get our mongoose model

User.on('index',function (err) {
    
});
var tokenSecret = config.secret;

mongoose.connect(config.database);

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));
//set api routes
app.use('/api', routes);

function ensureAuthenticated(req, res, next) {
    if (req.headers.authorization) {
        var token = req.headers.authorization.split(' ')[1];
        try {
            var decoded = jwt.decode(token, tokenSecret);
            if (decoded.exp <= Date.now()) {
                res.send(400, 'Access token has expired');
            } else {
                req.user = decoded.user;
                return next();
            }
        } catch (err) {
            return res.send(500, 'Error parsing token');
        }
    } else {
        return res.send(401);
    }
}

function createJwtToken(user) {
    var payload = {
        user: user,
        iat: new Date().getTime(),
        exp: moment().add(7, 'days').valueOf()
    };
    return jwt.encode(payload, tokenSecret);
}

app.post('/auth/signup', function(req, res, next) {
    var user = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    });
    user.save(function(err) {
        if (err) return next(err);
        res.sendStatus(200);
    });
});

app.post('/auth/login', function(req, res, next) {
    User.findOne({
        email: req.body.email
    }, function(err, user) {
        if (!user) return res.status(401).send('User does not exist');
        user.comparePassword(req.body.password, function(err, isMatch) {
            if (!isMatch) return res.send(401, 'Invalid email and/or password');
            var token = createJwtToken(user);
            res.send({
                token: token
            });
        });
    });
});

app.post('/auth/facebook', function(req, res, next) {
    var profile = req.body.profile;
    var signedRequest = req.body.signedRequest;
    var encodedSignature = signedRequest.split('.')[0];
    var payload = signedRequest.split('.')[1];

    var appSecret = '298fb6c080fda239b809ae418bf49700';

    var expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('base64');
    expectedSignature = expectedSignature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    if (encodedSignature !== expectedSignature) {
        return res.status(400).send('Invalid Request Signature');
    }

    User.findOne({
        facebook: profile.id
    }, function(err, existingUser) {
        if (existingUser) {
            var token = createJwtToken(existingUser);
            return res.send(token);
        }
        var user = new User({
            name: profile.name,

            facebook: {
                id: profile.id,
                email: profile.email
            }
        });
        user.save(function(err) {
            if (err) return next(err);
            var token = createJwtToken(user);
            res.send(token);
        });
    });
});

app.post('/auth/google', function(req, res, next) {
    var profile = req.body.profile;
    User.findOne({
        google: profile.id
    }, function(err, existingUser) {
        if (existingUser) {
            var token = createJwtToken(existingUser);
            return res.send(token);
        }
        var user = new User({
            name: profile.displayName,
            
            google: {
                id: profile.id,
                email: profile.emails[0].value
            }
        });
        user.save(function(err) {
            if (err) return next(err);
            var token = createJwtToken(user);
            res.send(token);
        });
    });
});

app.get('/api/users', function(req, res, next) {
    if (!req.query.email) {
        return res.status(400).send({
            message: 'Email parameter is required.'
        });
    }

    User.findOne({
        email: req.query.email
    }, function(err, user) {
        if (err) return next(err);
        res.send({
            available: !user
        });
    });
});



app.get('/api/shows', function(req, res, next) {
    var query = Show.find();
    if (req.query.genre) {
        query.where({
            genre: req.query.genre
        });
    } else if (req.query.alphabet) {
        query.where({
            name: new RegExp('^' + '[' + req.query.alphabet + ']', 'i')
        });
    } else {
        query.limit(12);
    }
    query.exec(function(err, shows) {
        if (err) return next(err);
        res.send(shows);
    });
});

//edit information
app.put('api/users/:id', ensureAuthenticated, function(req, res) {
    User.findOne({
        _id: req.params.id
    }, function(err, user) {

        if (err)
            res.send(err);

        for (prop in req.body) {
            user[prop] = req.body[prop];
        }

        // save the movie
        user.save(function(err) {
            if (err)
                res.send(err);

            res.json({
                message: 'your information is updated'
            });
        });

    });
});

app.post('/api/users/:id/follow', ensureAuthenticated, function(req, res, next) {
    User.findOne({
        _id: req.params.id
    }, function(err, userfollow) {
        if (err) return next(err);
        userfollow.followers.push(req.user._id);
        userfollow.save(function(err) {
            if (err) return next(err);
            res.send(200);
        });
    });
});

app.post('/api/users/:id/unfollow', ensureAuthenticated, function(req, res, next) {
    Show.findOne({
        _id: req.params.id
    }, function(err, userfollow) {
        if (err) return next(err);
        var index = userfollow.followers.indexOf(req.user._id);
        userfollow.subscribers.splice(index, 1);
        userfollow.save(function(err) {
            if (err) return next(err);
            res.send(200);
        });
    });
});

app.get('*', function(req, res) {
    res.redirect('/#' + req.originalUrl);
});

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send({
        message: err.message
    });

});

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

agenda.define('send email alert', function(job, done) {
    Show.findOne({
        name: job.attrs.data
    }).populate('subscribers').exec(function(err, show) {
        var emails = show.subscribers.map(function(user) {
            if (user.facebook) {
                return user.facebook.email;
            } else if (user.google) {
                return user.google.email
            } else {
                return user.email
            }
        });

        var upcomingEpisode = show.episodes.filter(function(episode) {
            return new Date(episode.firstAired) > new Date();
        })[0];

        var smtpTransport = nodemailer.createTransport('SMTP', {
            service: 'SendGrid',
            auth: {
                user: 'hslogin',
                pass: 'hspassword00'
            }
        });

        var mailOptions = {
            from: 'Fred Foo ✔ <foo@blurdybloop.com>',
            to: emails.join(','),
            subject: show.name + ' is starting soon!',
            text: show.name + ' starts in less than 2 hours on ' + show.network + '.\n\n' +
                'Episode ' + upcomingEpisode.episodeNumber + ' Overview\n\n' + upcomingEpisode.overview
        };

        smtpTransport.sendMail(mailOptions, function(error, response) {
            console.log('Message sent: ' + response.message);
            smtpTransport.close();
            done();
        });
    });
});

//agenda.start();

agenda.on('start', function(job) {
    console.log("Job %s starting", job.attrs.name);
});

agenda.on('complete', function(job) {
    console.log("Job %s finished", job.attrs.name);
});
