//----------------Require Statements--------------------------
var express = require('express');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var request = require('request');
var async = require('async');
var bodyParser = require('body-parser')
var fs = require('fs');
var crypto = require('crypto');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//---------------------Shared Global Variable------------------------------
var CurrentUsers = {};
//-----------------------User Class Defn----------------------------------
var User = function(name) {
    this.username = name;
    this.urls = [];
    this.curStatus = {};
    this.SocketID;
    this.isLoggedIn = true;
    this.RunningID;
    this.CallUrls = function(cb) {
        var that = this;
        async.map(this.urls, this.fetch.bind(this), function(err, results) {
            cb();
        });
    };
    this.fetch = function(url, cb) {
        var that = this;
        request.get(url, function(err, response, body) {
            if (err) {
                that.curStatus[url] = 0;
                cb(null, that.curStatus);
            } else {
                that.curStatus[url] = response.statusCode;
                cb(null, that.curStatus);
            }
        });
    };
};
//------------------------------------------------------------

fs.exists('Users.txt', function(exists) {
    if (!exists) {
        fs.writeFile('Users.txt', '{}', function(err) {
            if (err) throw err;
            console.log('It\'s saved!');
        });
    }
});
//-----------------------App Middleware------------------------------
app.use('/static',express.static(__dirname + '/Client'));
app.use('/url', expressJwt({
    secret: "ASDFEDsfdsafgsgtERFDSscsdgsdcv"
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
//-------------------------------------------------------------------

//---------------------------HTTP Actions----------------------------
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/Client/index.html');
});

app.post('/signup', function(req, res) {

    fs.readFile('Users.txt', {
        encoding: 'utf8'
    }, function(err, data) {
        if (err) {
            res.sendStatus(500);
        }
        var users = JSON.parse(data);
        try {
            if (typeof users[req.body.username] == 'undefined') {
                var newUserObj = {};
                newUserObj['Password'] = crypto.createHash('sha256').update(req.body.password).digest('hex');
                newUserObj['SecurityQuestion'] = req.body.SecurityQ;
                newUserObj['SecurityAnswer'] = crypto.createHash('sha256').update(req.body.SecurityA).digest('hex');
                users[req.body.username] = newUserObj;
                console.log(users);
                fs.writeFile('Users.txt', JSON.stringify(users), function(err) {
                    if (err) {
                        res.sendStatus(500);
                    }
                    console.log('It\'s saved!');
                    res.sendStatus(200);
                });
            } else {
                res.sendStatus(409);
            }
        } catch (err) {
            res.sendStatus(500);
        }
    });
});

app.post('/url', function(req, res) {
    try {
        if (CurrentUsers[req.body.username].isLoggedIn) {
            CurrentUsers[req.body.username].urls = req.body["urls[]"];
            res.sendStatus(200);
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        res.sendStatus(500);
    }
});

app.get('/logout/:username', function(req, res) {
    try {
        var username = req.params.username;
        CurrentUsers[username].isLoggedIn = false;
        clearInterval(CurrentUsers[username].RunningID);
        res.sendStatus(200);
    } catch (err) {
        res.sendStatus(500);
    }
});

app.post('/authenticate', function(req, res) {
    fs.readFile('Users.txt', {
        encoding: 'utf8'
    }, function(err, data) {
        if (!err) {
            try {
                var RegUsers = JSON.parse(data);
                if (typeof RegUsers[req.body.username] == 'undefined' || RegUsers[req.body.username]['Password'] != crypto.createHash('sha256').update(req.body.password).digest('hex')) {
                    res.sendStatus(401, 'Wrong user or password');
                    return;
                }

                var profile = {
                    name: req.body.username,
                    SecurityQuestion: RegUsers[req.body.username]['SecurityQuestion']
                };

                // We are sending the profile inside the token
                var token = jwt.sign(profile, "ASDFEDsfdsafgsgtERFDSscsdgsdcv", {
                    expiresInMinutes: 60 * 5
                });
                CurrentUsers[req.body.username] = new User(req.body.username);
                res.json({
                    token: token
                });
            } catch (err) {
                res.sendStatus(500)
            }
        } else {
            res.sendStatus(500);
        }
    });
});
//--------------------------------------------------------------------------------------------

//------------------------------------Socket Connection Handler-------------------------------

io.on('connection', function(socket) {
    var handshakeData = socket.request;
    CurrentUsers[handshakeData["_query"]["username"]].SocketID = socket.id;

    function SetEmit() {
        io.to(CurrentUsers[handshakeData["_query"]["username"]].SocketID).emit("CurrentStatus", CurrentUsers[handshakeData["_query"]["username"]].curStatus)
    }

    CurrentUsers[handshakeData["_query"]["username"]].RunningID = setInterval(function() {
        CurrentUsers[handshakeData["_query"]["username"]].CallUrls(SetEmit);
    }, 2000);
    socket.on('disconnect', function(){
        clearInterval(CurrentUsers[handshakeData["_query"]["username"]].RunningID);
        CurrentUsers[handshakeData["_query"]["username"]].isLoggedIn = false;
        console.log(CurrentUsers[handshakeData["_query"]["username"]]);
    });
});
//-------------------------------------------------------------------------------------------
server.listen(7000);