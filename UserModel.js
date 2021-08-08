const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Film = require('./FilmModel')

let userSchema = mongoose.Schema({
    username: String,
    password: String,
    type: String,
    reviews: [String],
    peopleFollowing: [String],
    usersFollowing: [String],
    followers: [String],
    watchlist: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Film'} ],
    recommended: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Film'} ],
    notifications: [String],
});

module.exports = mongoose.model("User", userSchema)