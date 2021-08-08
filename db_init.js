const mongoose = require('mongoose')
const movies = require("./movie-data-1000.json")
const Film = require('./FilmModel')
const User = require('./UserModel')

let users = [
    {   
        id: 1,
        username: "chowchow",
        password: "123",
        type: "regular",
        reviews: [],
        peopleFollowing: [],
        usersFollowing: [],
        followers: [],
        watchlist: [],
        recommended: [],
        notifications: [],
    },
    {   
        id: 2,
        username: "bob123",
        password: "123",
        type: "regular",
        reviews: [],
        peopleFollowing: [],
        usersFollowing: [],
        followers: [],
        watchlist: [],
        recommended: [],
        notifications: [],
    }
]

mongoose.connect('mongodb://localhost/movieDB', { useNewUrlParser: true });
let db = mongoose.connection;
db.on('error', console.log.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Connected to movieDB database.");
    mongoose.connection.db.dropDatabase(function (err, result) {
        if (err) {
            console.log("Error dropping database:");
            console.log(err);
            return;
        }
        console.log("Dropped database. Starting re-creation.");

        movies.forEach(movie => {
            // convert people to objs here
            let m = new Film({
                Title: movie.Title,
                Year: movie.Year,
                Released: movie.Released,
                Runtime: movie.Runtime,
                Genre: movie.Genre,
                Director: movie.Director,
                Writer: movie.Writer,
                Actors: movie.Actors,
                Plot: movie.Plot
            });

            m.save()
        });

        users.forEach(user => {
            let u = new User()
            u.username = user.username
            u.password = user.password
            u.type = user.type
            u.reviews = user.reviews
            u.peopleFollowing = user.peopleFollowing
            u.usersFollowing = user.usersFollowing
            u.followers = user.followers
            u.watchlist = user.watchlist
            u.recommended = user.recommended
            u.notifications = user.notifications
            u.save((err, result) => {
                if (err) {
                    console.log("Error saving user: " + JSON.stringify(u));
                    console.log(err.message);
                }
            })
        })
    });
});