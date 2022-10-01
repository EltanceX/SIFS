//Shimmer Island File System & Web Desktop
//Github: https://github.com/AquaDew/SIFS
const express = require("express");
const app = express();
const os = require("os");
const cookieParser = require('cookie-parser');
const fs = require("fs");
const uec = require("urlencode");
const jwt = require("jsonwebtoken");
const uuidv4 = require("uuid").v4;
const { getHost, replaceAll, convertSafePath, errorEnd } = require("./data/static/function");
process.on("uncaughtException", function (err) {
    logger.log(err.stack, "ERROR");
});

var lastLogin = {
    time: 0,
    ip: "0"
};
var logger = {
    get logFilename() {
        return `${__dirname}/data/logs/${replaceAll("/", "-", new Date().toLocaleDateString())}.log`;
    },
    /**
     * 
     * @param {String} info_ 
     * @param {DEBUG | FATAL | } type 
     */
    log: function (info_, type) {
        var date = new Date().toLocaleString();
        var info = `[${type ? type : "Info"}][${date}]${String(info_)}`;
        console.log(info);
        if (type === "DEBUG") {
            // console.log(info);
        } else if (type === "FATAL") {
            console.log(info_);
            fs.appendFileSync(this.logFilename, `${info}\n`, "utf8");
            process.exit(0);
        } else {
            fs.appendFileSync(this.logFilename, `${info}\n`, "utf8");
        }
    }
}
var user = JSON.parse(fs.readFileSync("data/user_data.json", "utf8"));
function saveUserData() {
    fs.writeFileSync("data/user_data.json", JSON.stringify(user, null, "\t"), "utf8");
}
!function () {
    let names = [];
    let uuids = [];
    let save = false;
    for (let i = 0; i < user.length; i++) {
        if (names.indexOf(user[i].name) !== -1) {
            logger.log("Duplicate user name.Please Check your 'user_data.json' file.", "FATAL");
        }
        if (uuids.indexOf(user[i].uuid) !== -1) {
            user[i].uuid = uuidv4();
            save = true;
        }
        if (!user[i].uuid) {
            user[i].uuid = uuidv4();
            save = true;
        }
        uuids.push(user[i].uuid);
        names.push(user[i].name);
        var uuid = user[i].uuid;
        try {
            fs.readdirSync("data/users/" + uuid);
        } catch (err) {
            if (err) {
                fs.mkdirSync("data/users/" + uuid);
            }
        }
    }
    save ? saveUserData() : undefined;
}();
var config = JSON.parse(fs.readFileSync("config.json", "utf8"));
if (!config.cookieSecret) {
    config.cookieSecret = uuidv4();
    fs.writeFileSync("config.json", JSON.stringify(config, null, "\t"));
}
/**
 * 
 * @param {String} uuid 
 * @param {String} log 
 * @param {String/Null} type 
 */
function userLog(uuid, log, type) {
    fs.appendFileSync(`data/users/${uuid}/user.log`, `[${type ? type : "log"}][${new Date().toLocaleString()}]${log}\n`, "utf8");
}
/**
 * 
 * @param {String} name 
 * @returns If name exists, return userObj; else return null
 */
function getUserByName(name) {
    for (var i = 0; i < user.length; i++) {
        if (user[i].name === name) {
            return user[i];
        }
    }
    return null;
}
/**
 * 
 * @param {String} uuid 
 * @returns If uuid exists, return userObj; else return null
 */
function getUserByUuid(uuid) {
    for (var i = 0; i < user.length; i++) {
        if (user[i].uuid === uuid) {
            return user[i];
        }
    }
    return null;
}
function checkLoginData(name, pwd) {
    var user = getUserByName(name);
    if (user && user.pwd === pwd) {
        return user;
    }
    return false;
}

app.use(cookieParser(config.cookieSecret));
app.use(express.static("resources"));
app.use(express.urlencoded({ extended: true }));
app.get("*", function (req, res, next) {
    logger.log(`[${req.ip}] ${req.url}`);
    next();
});
app.get("/window", function (req, res) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(fs.readFileSync("resources/html/window.html"));
});
app.get("/", function (req, res) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(fs.readFileSync("resources/html/welcome.html", "utf8"));
});
app.get("/getid", function (req, res) {
    console.log(req.signedCookies);
    var uuid = req.signedCookies.u;
    var token = req.signedCookies.t;
    if (uuid && token) {
        var user = getUserByUuid(uuid);
        if (user) {
            jwt.verify(token, user.login.token, function (err, decoded) {
                if (err) {
                    errorEnd(res, 412);
                } else {
                    res.status(200);
                    res.setHeader("Content-Type", "text/html; charset=utf-8");

                    res.end(user.name);
                }
            })
        } else {
            errorEnd(res, 403);
        }
    } else {
        errorEnd(res, 403);
    }
});
app.get("/login", function (req, res) {
    var time = new Date();
    if (time.getTime() - lastLogin.time <= 1000 && lastLogin.ip === req.ip) {
        errorEnd(res, 400);
    } else {
        lastLogin.time = time.getTime();
        lastLogin.ip = req.ip;
        var name = req.query.name;
        var pwd = req.query.pwd;
        var user = checkLoginData(name, pwd);
        if (user) {
            user.login.ip = req.ip;
            user.login.date = time.toLocaleString();
            user.login.tick = time.getTime();
            user.login.token = uuidv4();
            user.login.times++;
            saveUserData();
            jwt.sign({}, user.login.token, { expiresIn: 60 * 60 * 24 * 30 }, function (err, encoded) {
                if (err) {
                    logger.log(err, "ERROR");
                } else {
                    res.cookie("t", encoded, {
                        signed: true,
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60 * 24 * 7
                    });
                    res.cookie("u", user.uuid, {
                        signed: true,
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60 * 24 * 7
                    });
                    res.status(200);
                    res.end();
                    userLog(user.uuid, "Login successfully.");
                }
            })
        } else {
            errorEnd(res, 412);
        }
    }
})
app.listen(config.httpPort, function () {
    logger.log(`http://${getHost()}:${config.httpPort}`);
});
