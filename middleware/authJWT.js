const jwt = require("jsonwebtoken");

exports.VerifyToken = (req, res, next) => {
    let token = req.cookies['authToken'];

    if (!token) {
        return res.status(403).send({
            message: "No token provided"
        });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err)
            return res.status(401).send({
                message: "Unauthorized"
            });
        req.token = token
        req.userId = decoded.id;
        next();
    });
}

// this middle checks and verifies if a user is 
// a logged in user

exports.isLoggedIn = (req, res, next) => {
    // retrieve the cookie from incoming request
    const authToken = req.cookies['authToken'];
    req.token = authToken
    next()
}