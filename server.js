/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./movies');
var Review = require('./reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function (err){
            if(err){
                if (err.code == 11000)
                        return res.json({success:false, message: 'A user with that username already exists.'});
                else
                        return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username}).select('name username password').exec(function (err, user){
        if(err){
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch){
            if(isMatch){
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.get('/movies', function (req, res){
    if (!req.body.title){
        res.json({success: false, msg: 'Please include a title to search by'})
    }
    else {
        var movieSearch = new Movie();
        movieSearch.title = req.body.title;

        Movie.findOne({title: movieSearch.title}).select('title yearReleased genre actors').exec(function (err, movie) {
            if (err) {
                res.send(err);
            }
            if (movie == null) {
                res.status(200).send({
                    msg: 'Couldnt find requested movie',
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                })
            } else {
                if (req.query[reviews] === 1){
                    var reviewSearch = new Review();
                    reviewSearch.movie = req.body.title;

                    Review.find({movie: reviewSearch.movie}).select('username movie text rating').exec( function (err, reviews) {
                        if (err) {
                            res.send(err);
                        }
                        res.status(200).send({
                            msg: 'Movie found',
                            Movie: movie,
                            Reviews: reviews,
                            headers: req.headers,
                            query: req.query,
                            env: process.env.SECRET_KEY
                        })
                    })

                } else {
                    res.status(200).send({
                        msg: 'Movie found',
                        Movie: movie,
                        headers: req.headers,
                        query: req.query,
                        env: process.env.SECRET_KEY
                    })
                }
            }
        })
    }
});

router.post('/movies', function (req, res){
    if (!req.body.title || !req.body.yearReleased || !req.body.genre || !req.body.actors){
        res.json({success: false, msg: 'Please include all fields, incl those not updated'})
    }
    else {
        var movie = new Movie();
        movie.title = req.body.title;
        movie.yearReleased = req.body.yearReleased;
        movie.genre = req.body.genre;
        movie.actors = req.body.actors;

        movie.save(function (err) {
            if (err) {
                return res.json(err);
            }

            res.status(200).send({
                msg: 'Movie saved',
                headers: req.headers,
                query: req.query,
                env: process.env.SECRET_KEY
            })
        });
    }
});

router.put('/movies', authJwtController.isAuthenticated, function (req, res){
    if (!req.body.title){
        res.json({success: false, msg: 'Please include a title to search movies by'})
    }
    else {
        Movie.findOne({title: req.body.title}).select('title yearReleased genre actors').exec(function (err, movie) {
            if (err) {
                res.send(err);
            }

            movie.title = req.body.title;
            movie.yearReleased = req.body.yearReleased;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;

            movie.save(function (err) {
                if (err) {
                    return res.json(err);
                }
                res.status(200).send({
                    msg: 'Movie updated',
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                })
            });
        })
    }
});

router.delete('/movies', authJwtController.isAuthenticated, function (req, res){
    Movie.deleteOne({title: req.body.title}).exec(function (err){
        if(err){
            res.send(err);
        }

        res.status(200).send({msg: 'Movie deleted', headers: req.headers, query: req.query, env: process.env.SECRET_KEY})
    })
});

router.post('/reviews', authJwtController.isAuthenticated, function (req, res){
    if (!req.body.movie || !req.body.text || !req.body.rating || !req.body.username){
        res.json({success: false, msg: 'Please include all fields'})
    }
    else{
        var review = new Review();
        review.movie = req.body.movie;
        review.username = req.body.username;
        review.text = req.body.text;
        review.rating = req.body.rating;

        var movieSearch = new Movie();
        movieSearch.title = req.body.movie;

        Movie.findOne({title: movieSearch.title}).select('title yearReleased genre actors').exec(function (err, movie) {
            if (err) {
                res.send(err);
            }
            if (movie == null) {
                res.status(200).send({
                    msg: 'Couldnt find movie to associate review with',
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                })
            } else {
                review.save(function (err) {
                    if (err) {
                        return res.json(err);
                    }

                    res.status(200).send({
                        msg: 'Review saved',
                        headers: req.headers,
                        query: req.query,
                        env: process.env.SECRET_KEY
                    })
                });
            }
        })
    }
});

router.get('/reviews', function (req, res){
    if (!req.body.title){
        res.json({success: false, msg: 'Please include a title to search reviews by'})
    }
    else{
        var reviewSearch = new Review();
        reviewSearch.movie = req.body.title;

        Review.find({movie: reviewSearch.movie}).select('username movie text rating').exec( function (err, reviews){
            if (err) {
                res.send(err);
            }
            if (reviews == null) {
                res.status(200).send({
                    msg: 'Couldnt find any reviews for requested movie',
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                })
            } else {
                res.status(200).send({
                    msg: 'Found reviews for movie',
                    Review: reviews,
                    headers: req.headers,
                    query: req.query,
                    env: process.env.SECRET_KEY
                })
            }
        })
    }
});



app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


