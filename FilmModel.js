const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let movieSchema = mongoose.Schema({

    Title: String,
    Year: String,
    Released: String,
    Runtime: String,
    Genre: [String],
    Director: [String],
    Writer: [String],
    Actors: [String],
    Plot: String

});

module.exports = mongoose.model('Film', movieSchema)