const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const jwt = require("jsonwebtoken");

const router = express.Router();

// This route registers a new user when the
// username is not already taken.
// to register a new user bcrypt is used to hash the users password
// before storing it into the database.
router.post('/techoverflow/auth/register', (req,res, next) => {
    const username = req.body.username
    const password = req.body.password
    db.query(
        "SELECT * FROM user_table WHERE username = $1",
        [username],
        (err, result) => {
            if (err) next(err);
            if (result.rowCount == 0) {
                // when the row count is 0
                // there exist no user with the chosen username
                // the provided user data can be stored into the database

                // hashing the user password
                bcrypt.hash(password, 10, (err, hashedPassword) => {
                    if (err) next(err);

                    // inserting user details into the database
                    db.query(
                        `INSERT INTO user_table(username, password)
                        VALUES($1, $2) RETURNING *`,
                        [username, hashedPassword],
                        (err, result) => {
                            if (err) next(err);
                            if(result) {
                                res.send({message: "registration successful"});
                                // res.redirect("/");
                            }
                        }
                    );
                });
            } else {
                res.send({error:"username already exist"});
            }
        }
    )
});

// this route requires the username and password
// query it against the database, and if the user exists
// the user is logged into the app
router.post("/techoverflow/auth/login", (req, res, next) => {
    // retrieve the user information from the request body
    const username = req.body.username;
    const password = req.body.password;

    // query the database to test whether the user exists
    db.query(
        `SELECT * FROM user_table WHERE username=$1`,
        [username],
        (err, queryResult) => {
            if (err) {
                throw err;
            }
            if (queryResult) {
                // if a user exists with that username
                // hash the password passed by the user
                // then compare it with the stored password in the database
                // and if they match return the response.
                if (queryResult.rowCount == 0) {
                    return res.status(404).send({error:"user doesn't exist", accessToken: null});
                }
                const data = queryResult.rows[0];
                const hashedPassword = data.password;
                bcrypt.compare(password, hashedPassword, (err, isEqual) => {
                    if (err) res.send({error: "you entered an incorrect password", accessToken: null});
                    if (isEqual) {
                        // res.redirect("/techoverflow/questions");

                        // create a new token object
                        let token = jwt.sign({id: data.id}, process.env.ACCESS_TOKEN_SECRET, {
                            expiresIn: process.env.ACCESS_TOKEN_LIFE
                        });

                        res.cookie('authToken', token);

                        res.status(200).send({
                            id: data.id,
                            username: data.username,
                            joined: data.joined,
                            upvotes: data.upvotes,
                            questionsAsked: data.questionsasked,
                            accessToken: token
                        });
                    } 
                    else {
                        res.status(200).send({
                            error: "password does not match"
                        })
                    }
                });
            }
            
        }
    );
});

module.exports = router
