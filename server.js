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
var Movie = require('./Movies');

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

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
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

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
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

router.get('/movies', authJwtController.isAuthenticated, (req, res) => {
    Movie.find({ title: { $exists: true } })
        .then(movies => {
            res.status(200).json(movies);
        })
        .catch(error => {
            console.error('Error finding movies:', error);
            res.status(500).json({ error: 'An error occurred while fetching movies' });
        });
});
 
router.post('/movies', authJwtController.isAuthenticated, (req, res) => {
    const {title, releaseDate, genre, actors } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    const newMovie = new Movie({ title, releaseDate, genre, actors });
 
    newMovie.save()
        .then(savedMovie => {
            res.status(200).json(savedMovie);
        });
});
 
router.put('/movies/:title', authJwtController.isAuthenticated, (req, res) => {
    const { title } = req.params;
    const { releaseDate, genre, actors } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
    Movie.findOneAndUpdate({ title: title }, { releaseDate, genre, actors }, { new: true })
        .then(updatedMovie => {
            res.status(200).json(updatedMovie);
        })
        .catch(error => res.status(500).json({ error: 'An error occurred while updating the movie' }));
});
 
router.delete('/movies/:title', authJwtController.isAuthenticated, (req, res) => {
    const { title } = req.params;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    Movie.findOneAndDelete({ title: title })
        .then(deletedMovie => {
            if (!deletedMovie) {
                return res.status(404).json({ error: 'Movie not found' });
            }
            res.status(200).json({ message: 'Movie deleted successfully' });
        })
        .catch(error => res.status(500).json({ error: 'An error occurred while deleting the movie' }));
});

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


