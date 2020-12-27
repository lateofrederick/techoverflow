const express = require("express");
const router = express.Router();
const db = require("../db/database");
const authJWT = require("../middleware/authJWT");

router.get("/techoverflow/questions", (req, res, next) => {
  db.query("SELECT * FROM question_table;", null, (err, resp) => {
    if (err) next(err);
    res.send(resp.rows);
  });
});

// this route handles posting a new question
// the user must first be authenticated before allowed to
// to post a question
router.post("/techoverflow/questions", (req, res, next) => {
  const title = req.body.title;
  const date = new Date();
  const datePosted =
    date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  const userId = 6;

  // post the question to the database
  db.query(
    `INSERT INTO question_table(title, asked, user_id)
        VALUES($1, $2, $3)`,
    [title, datePosted, userId],
    (err, result) => {
      if (err) next(err);
      if (result) {
        res.send(result);
      }
    }
  );
});

// route that allows a use to update a posted question
// only logged in users can update a question when necessary
router.put(
  "/techoverflow/questions/:questionId",
  authJWT.VerifyToken,
  (req, res, next) => {
    // check whether request was by a logged in user
    if (req.token) {
      // retrieve request body and params passed
      const questionId = req.params.questionId;
      const updatedQuestion = req.body.questionText;

      // select question from database if it exist
      db.query(
        `SELECT * FROM question_table WHERE id = $1`,
        [questionId],
        (err, result) => {
          if (err) next(err);
          if (result.rowCount != 0) {
            // if the question exist and it is retrieved perform a write operation on the database
            // to update the question text.
            db.query(
              `UPDATE question_table SET title = $1 RETURNING *`,
              [updatedQuestion],
              (err, result) => {
                if (err) next(err);
                if (result) {
                  res.status(200).send({ result });
                }
              }
            );
          } else {
            // question does not exist
            res.status(404).send({ error: "question does not exist" });
          }
        }
      );
    }
  }
);

// this route is for retrieving a question and its answers
// authentication is not really required to get information about a question
router.get("/techoverflow/questions/:questionId", (req, res, next) => {
  const questionId = req.params.questionId;

  // retrieve all data about the question from the database
  db.query(
    `
    SELECT title, question_table.upvotes, question_table.downvotes, answerCount, asked, 
    question_table.user_id, answer
    FROM question_table LEFT JOIN answer_table
    ON answer_table.question_id = question_table.id
  `,
    null,
    (err, result) => {
      if (err) next(err);
      if (result) {
        res.status(200).send(result);
      }
    }
  );
});

// this route updates the question upvotes
// only an authenticated user can upvote any question
router.put(
  "/techoverflow/questions/:questionId/upvotes",
  authJWT.isLoggedIn,
  (req, res, next) => {
    // verify if the request was by a logged in user
    if (req.token) {
      // get the question id from the request
      const questionId = req.params.questionId;

      // once the question id has been retrieved a read operation is performed
      // on the database
      db.query(
        `SELECT * FROM question_table WHERE id = $1`,
        [questionId],
        (err, result) => {
          if (err) next(err);
          if (result.rowCount != 0) {
            // if the question is successfully retrieved from the database
            // increase the upvotes value by one and write the data back to the database
            const data = result.rows[0];
            const newUpVotes = data.upvotes + 1;
            db.query(
              `UPDATE question_table SET upvotes = $1 RETURNING *`,
              [newUpVotes],
              (err, result) => {
                if (err) next(err);
                if (result) {
                  res.send(result);
                }
              }
            );
          } else {
            res.send({ error: "question does not exist" });
          }
        }
      );
    } else {
      res.send({ error: "you are not logged in" });
    }
  }
);

// this route updates the downvotes of a question
// a user can only downvote a question once logged in
router.put(
  "/techoverflow/questions/:questionId/downvotes",
  authJWT.isLoggedIn,
  (req, res, next) => {
    // check if request was by an authenticated user
    if (req.token) {
      // retrieve the question id from the request
      const questionId = req.params.questionId;

      // retrieving question from the database
      db.query(
        `SELECT * FROM question_table WHERE id = $1`,
        [questionId],
        (err, result) => {
          if (err) next(err);
          if (result.rowCount != 0) {
            // increase the down votes by 1 once the question has been
            // successfully retrieved then write the result back to the database
            const newDownVote = result.rows[0].downvotes + 1;
            db.query(
              `UPDATE question_table SET downvotes = $1 RETURNING *`,
              [newDownVote],
              (err, result) => {
                if (err) next(err);
                if (result) {
                  res.send(result);
                }
              }
            );
          } else {
            res.status(404).send({ error: "question not found" });
          }
        }
      );
    } else {
      res.send({ error: "you must be logged in first" });
    }
  }
);

// this route allows a user to post an answer to a question
// a user must be authenticated to take perform this action
router.post(
  "/techoverflow/questions/:questionId/answer",
  authJWT.VerifyToken,
  (req, res, next) => {
    if (req.token) {
      const questionId = req.params.questionId;
      const userId = req.userId;
      const answer = req.body.answer;

      // insert the answer data into the database
      db.query(
        `INSERT INTO answer_table (answer, question_id, user_id)
      VALUES ($1, $2, $3) RETURNING *`,
        [answer, questionId, userId],
        (err, result) => {
          if (err) next(err);
          if (result) {
            res.status(200).send(result);
          }
        }
      );
    }
  }
);

// a route that allows a user to edit an answer
// authentication is required.
router.put(
  "/techoverflow/questions/:questionId/:answerId",
  authJWT.VerifyToken,
  (req, res, next) => {
    if (req.token) {
      // retrieve request parameter once user is logged in
      const answerId = req.params.answerId;
      const newAnswerText = req.body.answerText;

      // query database to check if answer exist, if it exist 
      // update the answer
      db.query(
        `SELECT * FROM answer_table WHERE id = $1`,
        [answerId],
        (err, result) => {
          if (err) next(err);
          if (result.rowCount != 0) {
            // update the answer text once the answer exist
            db.query(`
            UPDATE answer_table SET answer = $1 RETURNING *`,
            [newAnswerText],
            (err, result) => {
              if (err) next(err);
              if (result) {
                res.status(200).send({result});
              }
            })
          } else {
            // answer does not exist in the database
            res.status(400).send({error: "answer does not exist"});
          }
        }
      )
    }
  }
);

// this route allows a user to upvote an answer to a  question
// authentication is required to be able to upvote a question
router.put(
  "/techoverflow/questions/:questionId/:answerId/upvote",
  authJWT.VerifyToken,
  (req, res, next) => {
    // verify if the user is logged in first
    if (req.token) {
      // retrieve request data
      const answerId = req.params.answerId;

      db.query(
        `SELECT * FROM answer_table WHERE id = $1`,
        [answerId],
        (err, result) => {
          if (err) next(err);
          if (result.rowCount != 0) {
            // if there exists such an answer increase the upvotes value by one
            // and store it back into the database
            const newUpVote = result.rows[0].upvotes + 1;
            db.query(
              `UPDATE answer_table SET upvotes = $1 RETURNING *`,
              [newUpVote],
              (err, result) => {
                if (err) next(err);
                if (result) {
                  res.status(200).send(result);
                }
              }
            );
          } else {
            res.status(404).send({ error: "answer does not exist" });
          }
        }
      );
    }
  }
);

// a route that enables a user to downvote an answer
// an authenticated user can only downvote an answer
router.put(
  "/techoverflow/questions/:questionId/:answerId/downvote",
  authJWT.VerifyToken,
  (req, res, next) => {
    if (req.token) {
      // retrieve request data
      const answerId = req.params.answerId;
      db.query(
        `SELECT * FROM answer_table WHERE id = $1`,
        [answerId],
        (err, result) => {
          if (err) next(err);
          if (result.rowCount != 0) {
            const newDownVote = result.rows[0].downvotes + 1;
            // update downvotes in the database
            db.query(
              `UPDATE answer_table SET downvotes = $1 RETURNING *`,
              [newDownVote],
              (err, result) => {
                if (err) next(err);
                if (result) {
                  res.status(200).send(result);
                }
              }
            );
          } else {
            res.status(400).send({ error: "question not found" });
          }
        }
      );
    }
  }
);

module.exports = router;
