const express = require('express');
const session = require('express-session');
const redis = require('redis');
const connectRedis = require('connect-redis');
const app = express();
const fs = require("fs");
const request = require('request');
const firebase = require("firebase");
const firebaseAdmin = require("firebase-admin");
const cookieParser = require("cookie-parser");
const { indexOf } = require('lodash');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// enable this if you run behind a proxy (e.g. nginx)
app.use(cookieParser("cookie-secret-xsm-#$%^2345"));
app.set('trust proxy', 1);
const RedisStore = connectRedis(session);
const REDISHOST = process.env.REDISHOST || 'redis-16955.c228.us-central1-1.gce.cloud.redislabs.com';
const REDISPORT = process.env.REDISPORT || 16955;
const redisClient = redis.createClient({
    host: REDISHOST,
    port: REDISPORT,
    password: 't2xTcjGhV55ACnKm2L0tJHSNDUKAMyLD'
});
redisClient.on('error', err => console.error('ERR:REDIS:', err));

redisClient.on('connect', function (err) {
    console.log('Connected to redis successfully');
});
//Configure session middleware
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'secret$%^134',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // if true only transmit cookie over https
        httpOnly: false, // if true prevent client side JS from reading the cookie 
        maxAge: 1000 * 60 * 10 // session max age in miliseconds
    }
}))

let firebase_config = JSON.parse(fs.readFileSync("unodev-firebase-adminsdk-rs273-66d0d40e12.json"));
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(firebase_config),
    databaseURL: "https://unodev.firebaseio.com",
});

app.use("/*", ensureAuthenticated);

function ensureAuthenticated(req, res, next) {
    const authorization = req.header("authorization");
    console.log("Line no 55");
    console.log(req.session.jwt);
    if (req.session.jwt == undefined) {
        if (authorization) {
            console.log("Line no 58");
            let token = authorization;
            firebaseAdmin
                .auth()
                .verifyIdToken(token)
                .then((decodedToken) => {
                    var userName = decodedToken.email.substring(0,indexOf(decodedToken.email("@")));
                    console.log(userName)
                    GetJWT(userName).then(token => {
                        req.session.jwt = token.jwtToken;
                        req.session.companyId = token.companyId;
                        console.log(token);
                        next();
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(401).send('Firebase token Expired!')
                });
        } else {
            console.log(req.url);
            console.log("Authorization header is not found");
            res.status(401).send('Authorization header is not found')
        }
    }
    else {
        console.log("Line no 81");

        console.log(req.session.jwt);
        next();
    }
}
app.get("/foundation/AllCompanies", (req, res) => {
    let companyId = req.session.companyId;
    let jwt = req.session.jwt;
    var options = {
        'method': 'GET',
        'url': 'https://uno-fnd-dot-unodev.uc.r.appspot.com/api/company',
        'headers': {
            'x-user-payload': jwt,
            'company-id': companyId
        }
    };
    request(options, function (error, response) {
        if (error) {
            console.log(error);
            res.send(error);
        };
        let data = JSON.parse(response.body);
        res.send(data);
    });
});

app.get("/getCompanyById", (req, res) => {
    let companyId = req.session.companyId;
    let jwt = req.session.jwt;
    var options = {
        'method': 'GET',
        'url': 'http://uno-fnd-dot-unodev.uc.r.appspot.com/api/company?companyId=C1',
        'headers': {
            'x-user-payload': jwt,
            'company-id': companyId
        }
    };
    request(options, function (error, response) {
        if (error) {
            console.log(error);
            res.send(error);
        };
        let data = JSON.parse(response.body);
        res.send(data);
    });
});

app.post("/saveCompany", (req, res) => {
    var data = JSON.parse(req.body);
var options = {
  'method': 'POST',
  'url': 'http://uno-fnd-dot-unodev.uc.r.appspot.com/api/company',
  'headers': {
    'x-user-payload': req.session.jwt,
    'company-id': req.session.companyId,
    'Content-Type': 'application/json'
  },
  body: data

};
request(options, function (error, response) {
  if (error) {
	console.log(error);
	res.send(401);
}
  console.log(response.body);
	res.send(response.body)
});

});

app.get("/getcompanyName",(req,res)=>{
    let companyName=req.session.companyName;
    let jwt = req.session.jwt;
    var options = {
        'method':'GET',
        'url':'http://uno-fnd-dot-unodev.uc.r.appspot.com/api/company/getCompanyName?companyName=C1-hcl',
        'headers': {
            'x-user-payload':jwt,
            'company-Name':companyName
        }
    };
    request(options,function(error,response){
        if(error){
            console.log(error);
            res.send(error);
        };
        let data = JSON.parse(response.body);
        res.send(data)
    })
})
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return console.log(err);
        }
        res.status(200).send('Logged out successfully.')
    });
});

app.get("/home", (req, res) => {
    var session = ""
    if (req.session) {
        session = req.session;

    }
    res.status(200).send(session);

});

const GetJWT = function (email) {
    return new Promise(function (resolve, reject) {
        let uri = `http://uno-fnd-dot-unodev.uc.r.appspot.com/api/fulfillments/user?userName=${email}`;
        var options = {
            'method': 'GET',
            'url': uri
        };
        request(options, function (error, response) {
            if (error) {
                console.log(error);
                reject(error);
            }
            let jwtToken = JSON.parse(response.body);
            console.log(jwtToken);
            resolve(jwtToken);
        });
    });
}

const PORT = "8080"
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log("Press Ctrl+C to quit.");
});

app.get("/foundation/Department", (req, res) => {
    let companyId = req.session.companyId;
    let jwt = req.session.jwt;
    var options = {
        'method': 'GET',
        'url': 'https://uno-fnd-dot-unodev.uc.r.appspot.com/api/department',
        'headers': {
            'x-user-payload': jwt,
            'company-id': companyId
        }
    };
    request(options, function (error, response) {
        if (error) {
            console.log(error);
            res.send(error);
        };
        let data = JSON.parse(response.body);
        res.send(data);
    });
});