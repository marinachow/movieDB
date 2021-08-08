//Marina Chow

//Create express app
const express = require('express');
const session = require("express-session");
const app = express();
const port = 3000;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

//View engine
const pug = require("pug");
const path = require("path");
app.set("view engine", "pug");
app.set("views", "./public/views")

//MongoDB
const mongoose = require("mongoose");
const Film = require('./FilmModel')
const User = require('./UserModel')
let ObjectId = require('mongodb').ObjectID;
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
	url: 'mongodb://localhost/movieDB',
	collection: 'sessions'
});

app.use(express.static("public"));
app.use(express.json());
app.use(
	session({
		secret: "some secret key here",
		resave: true,
		store: store,
		saveUninitialized: false, 
	})
);

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))

//Set up the required data
let moviesArray = require("./movie-data-2500.json");
const { query } = require("express");
let usersArray = [];
let peopleArray = [];
let reviewsArray = [];

//Create attributes for movies
let i = 0;
moviesArray.forEach(movie => {
	movie.mID = i++;
	movie.Reviews = [];
	movie.Similar = [];
	AverageRating = 0;
});

//Convert actors, writers and directors into people objects
moviesArray.forEach(movie => {
	let actorObjs = [];
	movie.Actors.forEach(actor => {
		let actorObj = {};
		actorObj.pID = actor,
		actorObj.works = [],
		actorObj.collabs = [];
		let foundPerson = peopleArray.find(obj => {
			return obj.pID === actorObj.pID
		})
		if (!foundPerson)
			peopleArray.push(actorObj);
		actorObjs.push(actorObj);
	});
	movie.Actors = actorObjs;
	let writerObjs = [];
	movie.Writer.forEach(writer => {
		let writerObj = {};
		writerObj.pID = writer,
		writerObj.works = [],
		writerObj.collabs = [];
		let foundPerson = peopleArray.find(obj => {
			return obj.pID === writerObj.pID
		})
		if (!foundPerson)
			peopleArray.push(writerObj);
		writerObjs.push(writerObj);
	});
	movie.Writer = writerObjs;
	let directorObjs = [];
	movie.Director.forEach(director => {
		let directorObj = {};
		directorObj.pID = director,
		directorObj.works = [],
		directorObj.collabs = [];
		let foundPerson = peopleArray.find(obj => {
			return obj.pID === directorObj.pID
		})
		if (!foundPerson)
			peopleArray.push(directorObj);
		directorObjs.push(directorObj);
	});
	movie.Director = directorObjs;
});
 
// Add works for each person in peopleArray
moviesArray.forEach(movie => {
	peopleArray.forEach(person => {
		let allPeople = []
		allPeople = (movie.Actors).concat(movie.Writer, movie.Director);
		const foundPerson = allPeople.find(obj => {
			return obj.pID === person.pID
		})
		if (foundPerson) {
			const foundMoive = person.works.find(obj => {
				return obj.mID === movie.mID
			})
			if (!foundMoive) {
				person.works.push(movie);
			}
		}
	});
});

// Add collabs for each person in peopleArray
peopleArray.forEach(person => {
	let allCollabs = [];
	person.works.forEach(work => {
		let allWorks = []
		allWorks = (work.Actors).concat(work.Writer, work.Director);
		allWorks = allWorks.filter(obj => {
			return obj.pID !== person.pID;
		});
		allCollabs = allCollabs.concat(allWorks.filter((p, index, self) => 
			index === self.findIndex((t) => 
				(t.pID === p.pID))))
	})
	let len = allCollabs.length;
	for (i = 0; i < Math.min(len, 5); i++) {
		let val = most(allCollabs);
		allCollabs = allCollabs.filter(v => v != val)
		person.collabs.push(val);
	}
});

// Function to get the most common person in a person's collab array
function most(arr){
	return arr.sort((a,b) =>
          arr.filter(person => person.pID==a.pID).length
        - arr.filter(person => person.pID==b.pID).length
    )[0];
}

//Route handlers
// Static pages
// Home page
app.get("/", (request, response) => {
	response.status(200).render("index", { session: request.session });
});
// CSS
app.get("/center", (request, response) => {
	response.status(200).sendFile("/center.css", {root: __dirname});
});
// Login page
app.get("/login", (request, response) => {
	response.status(200).sendFile("public/views/login.html", {root: __dirname});
});
// Sign up page
app.get("/create", (request, response) => {
	response.status(200).sendFile("pages/create.html", {root: __dirname});
});
// Page for a contributer to add a person to the database
app.get("/addPerson", (request, response) => {
	response.status(200).sendFile("pages/addPerson.html", {root: __dirname});
});
// Page for a contributer to add a movie to the database
app.get("/addMovie", (request, response) => {
	response.status(200).sendFile("pages/addMovie.html", {root: __dirname});
});

// Dynamically rendered pages
// Page to display all movies in database
app.get("/browseMovies", (request, response) => {
	Film.find().exec(function(err, filmResult) {
		if (err)
			response.send(err);
		else if (filmResult.length)
			response.status(200).render("browseMovies", { movies: filmResult });
		else
			response.send("No movies found");
		db.close();
	});	
});
// Page to search for a movie by title, genre and/or actor name
app.get("/movieSearch", (request, response) => {
	response.status(200).send(
		pug.renderFile("./pages/movieSearch.pug", { movies: moviesArray })
	);
});
// User profile page
app.get("/profile", (request, response) => {
	// Get user object of logged in user
	let targetUser = usersArray.find(obj => {
		return obj.uID === request.session.username
	})
	if (targetUser)
		response.status(200).send(pug.renderFile("./pages/profile.pug", { profile: targetUser }));
	else
		response.status(401).send("Not logged in.");
});

// Movie requests
app
	.route("/movies")
	// Get movies that respect query paramaters, code from Dave Mckenney's lecture
	.get((request, response) => {
		const MAX_MOVIES = 50;
		try {
			if (!request.query.limit) 
				request.query.limit = 10;
			else {
				request.query.limit = Number(request.query.limit);
				if (request.query.limit > MAX_MOVIES) 
					request.query.limit = MAX_MOVIES;
			}
		} catch {
			request.query.limit = 10;
		}

		//Parse page parameter
		try {
			if (!request.query.page){
				request.query.page = 1;
			} else {
				request.query.page = Number(request.query.page);
				if (request.query.page < 1)
					request.query.page = 1;
			}
		} catch {
			request.query.page = 1;
		}

		//Build up a matching query string to allow pagination
		let params = [];
		for (param in request.query) {
			if (param == "page") {
				continue;
			}
			params.push(param + "=" + request.query[param]);
		}
		request.qstring = params.join("&");
		let results = [];
		let count = 0;
		let pageCount = 0;
		let startIndex = (request.query.page-1) * Number(request.query.limit);
		for (let movie of moviesArray) {
			//If the movie matches the query parameters
			if (movieMatch(movie, request.query)) {
				//Add to results if we are at the correct index
				if (count >= startIndex){
					if (count < startIndex+10) {
						results.push(movie);
					}
					pageCount++;
				}
				count++;	
			}
		}
		response.status(200).send(
			pug.renderFile("./pages/searchResults.pug", { movies: results, qstring: request.qstring, current: request.query.page, count: pageCount})
		);
	})
	// Creates a new movie object and adds it to the database
	.post((request, response) => {
		//Parse response body of people
		let directorArr = request.body.Director.split(", ");
		directorArr = directorArr.slice(0, directorArr.length-1)
		let writerArr = request.body.Writer.split(", ");
		writerArr = writerArr.slice(0, writerArr.length-1)
		let actorArr = request.body.Actor.split(", ");
		actorArr = actorArr.slice(0, actorArr.length-1)

		//Convert string arrays to people object arrays
		let directorObjArr = [];
		directorArr.forEach(dStr =>{
			directorObjArr.push(peopleArray.find(personObj => {
				return personObj.pID == dStr
			}))
		});
		let writerObjArr = [];
		writerArr.forEach(wStr =>{
			writerObjArr.push(peopleArray.find(personObj => {
				return personObj.pID == wStr
			}))
		});
		let actorObjArr = [];
		actorArr.forEach(aStr =>{
			actorObjArr.push(peopleArray.find(personObj => {
				return personObj.pID == aStr
			}))
		});
		// If user tries to add a person not in the database
		if (directorObjArr.length == 0 || writerObjArr.length == 0 || actorObjArr.length == 0) {
			response.status(401).send("Invalid director, writer or actor name. Add person to databse before adding movie.");
			return;
		}
		let newMovie = {
			Title: request.body.Title,
			Released: request.body.Released,
			Runtime: request.body.Runtime,
			Genre: [request.body.Genre],
			Director: directorObjArr,
			Writer: writerObjArr,
			Actors: actorObjArr,
			Plot: request.body.Plot,
			mID: moviesArray.length+1,
			Reviews: [],
			AverageRating: 0,
			Similar: [],
		}
		directorObjArr.forEach(dObj => { 
			dObj.works.push(newMovie)
		});
		writerObjArr.forEach(wObj => { 
			wObj.works.push(newMovie)
		});
		actorObjArr.forEach(aObj => { 
			aObj.works.push(newMovie)
		});
		let allPeople = [];
		allPeople = (newMovie.Actors).concat(newMovie.Writer, newMovie.Director);
		moviesArray.push(newMovie);
		// Alert all users following any people in new movie
		usersArray.forEach(user => {
			user.peopleFollowing.forEach(following => {
				allPeople.forEach(person => {
					if (person.pID === following.pID)
						user.notifications.push("New movie with " + person.pID + " was added");
				});
			});
		});
		response.status(200)
		response.redirect("/movies/" + newMovie.mID);
	});
app.get("/movies/:mID", (request, response) => {
	Film.findById(request.params.mID).exec((err, movie) => {

		response.format({
			'application/json': function () {
				console.log('The request was JSON..')
				response.status(200).send(JSON.stringify(movie))
			},

			'text/html': function () {
				response.render("movie", { profile: request.session.username, movie : movie })
			}
		})
	})
		// // Check if a movie with the specified ID exists
		// let targetMovie = moviesArray.find(obj => {
		// 	return obj.mID == request.params.mID
		// })
		// if (targetMovie) {
		// 	response.status(200);
		// 	// Create copies of review objects to access attributes to display on movies's page
		// 	let reviewObjs = [];
		// 	targetMovie.Reviews.forEach(reviewID => {
		// 		reviewsArray.forEach(reviewObj => {
		// 			if (reviewID == reviewObj.rID)
		// 			reviewObjs.push(Object.assign({}, reviewObj))
		// 		});
		// 	});
		// 	// Create a user object copy for each review's reviewer
		// 	reviewObjs.forEach(reviewObj => {
		// 		usersArray.forEach(reviewer => {
		// 			if (reviewObj.reviewer == reviewer.uID)
		// 				reviewObj.reviewer = Object.assign({}, reviewer);
		// 		})
		// 	})
		// 	// Get all genres from targetMovie
		// 	let targetGenres = [];
		// 	targetMovie.Genre.forEach(gen => {
		// 		if (!targetGenres.includes(gen))
		// 			targetGenres.push(gen)
		// 		});
		// 	// Find movies with same genres and add to movie's Similar array
		// 	targetGenres.forEach(prefer => {
		// 		let similar = moviesArray.find(movie => {
		// 			return targetMovie.mID !== movie.mID && !targetMovie.Similar.includes(movie) && movie.Genre.includes(prefer);
		// 		});
		// 		if (similar && targetMovie.Similar.length <= 3)
		// 			targetMovie.Similar.push(similar);
		// 	});
		// 	// If user is logged in, send that users information to track their activity on the page
		// 	if (request.session.username)
		// 		response.send(pug.renderFile("./pages/movie.pug", { movie: targetMovie, profile: request.session.username, reviews: reviewObjs, similars: targetMovie.Similar }));
		// 	else
		// 		response.send(pug.renderFile("./pages/movie.pug", { movie: targetMovie, reviews: reviewObjs, similars: targetMovie.Similar }));
		// } else
		// 	response.status(404).send(`Movie with ID ${request.params.mID} does not exist.`);
		
	})

// Users requests
app.get("/users/:uID", (request, response) => {

	let uID = new ObjectId(request.params.uID)
	User.findById(uID).populate('watchlist').exec((err, user) => {

		if (err) response.status(404).send("Can't find user")

		response.format({
			'application/json': function () {
				console.log('The request was JSON..');
				response.status(200).send(JSON.stringify(user))
			},

			'text/html': function () {
				
				console.log("The request was HTML..");
				if (request.session.loggedin && user.username == request.session.username) 
					response.status(200).render("profile", { profile: user, session: request.session })
				else if (request.session.loggedin && user) 
					response.status(200).render("user", { user: user, session: request.session })
				else 
					response.status(300).send("You are not logged in")
			}
		})
	})
	// // Check if a user with the specified ID exists
	// let targetUser = usersArray.find(obj => {
	// 	return obj.uID === request.params.uID
	// })
	// if (targetUser) {
	// 	response.status(200);
	// 	// Create copies of review objects to access attributes to display on user's page
	// 	let reviewObjs = [];
	// 	targetUser.reviews.forEach(reviewID => {
	// 		reviewsArray.forEach(reviewObj => {
	// 			if (reviewID == reviewObj.rID)
	// 			reviewObjs.push(Object.assign({}, reviewObj))
	// 		});
	// 	});
	// 	// Create copies of movie objects to display with each review
	// 	moviesArray.forEach(movieObj => {
	// 		reviewObjs.forEach(reviewObj => {
	// 			if (movieObj.mID == reviewObj.movie)
	// 				reviewObj.movie = Object.assign({}, movieObj);
	// 		});
	// 	});
	// 	// Display profile if user is logged in
	// 	if (request.session.username == targetUser.uID)
	// 		response.send(pug.renderFile("./pages/profile.pug", { profile: targetUser }));
	// 	else {
	// 		if (request.session.username)
	// 			response.send(pug.renderFile("./pages/user.pug", { user: targetUser, profile: request.session.username, reviews: reviewObjs}));
	// 		else
	// 			response.send(pug.renderFile("./pages/user.pug", { user: targetUser, reviews: reviewObjs}));
	// 	}
	// } else 
	// 	response.status(404).send(`User with ID ${request.params.uID} does not exist.`);
});

// Adds new user to database
app.post("/users/signup", signup);
app.post("/users/login", login);
app.get("/users/:uID/logout", logout);

// Updates account type
app.put("/users/:uID/accountType", (request, response) => {
		// Get user making request
		let profileUser = usersArray.find(obj => {
			return obj.uID === request.session.username
		})
		if (profileUser) {
			if (profileUser.type === "regular")
				profileUser.type = "contributer";
			else if (profileUser.type === "contributer")
				profileUser.type = "regular";
			response.status(200)
			response.redirect("/profile");
		} else
			response.status(401).send("Not logged in.");
	});
// 
app.put("/users/:uID/peopleFollowing", (request, response) => {
		// Get user making request
		let profileUser = usersArray.find(obj => {
			return obj.uID === request.session.username
		})
		// Check which button the user clicked and update its peopleFollowing array accordingly
		if (profileUser) {
			if (request.body.hasOwnProperty("unfollowPerson")) {
				let personFollowing = profileUser.peopleFollowing.find(obj => {
					return obj.pID === request.body.unfollowPerson
				});
				if (personFollowing) {
					profileUser.peopleFollowing = profileUser.peopleFollowing.filter(p => p != personFollowing)
					response.status(200)
					response.redirect("/profile");
				} else
					response.status(401).send("Error, you are not following this person");
			}
			else if (request.body.hasOwnProperty("followPerson")) {
				let personFollowing = profileUser.peopleFollowing.find(obj => {
					return obj.pID === request.body.followPerson
				});
				if (!personFollowing) {
					let followPerson = peopleArray.find(obj => {
						return obj.pID === request.body.followPerson
					});
					profileUser.peopleFollowing.push(followPerson);
					response.status(200)
					response.redirect("/profile");
				}
				else
					response.status(401).send("Error, you are already following this person");				
			}
		} else
			response.status(401).send("Not logged in.");
	});
app.put("/users/:uID/usersFollowing", (request, response) => {
		// Get user making request
		let profileUser = usersArray.find(obj => {
			return obj.uID === request.session.username
		})
		// Check which button the user clicked and update its usersFollowing array accordingly
		if (profileUser) {
			if (request.body.hasOwnProperty("unfollowUser")) {
				let userFollowing = profileUser.usersFollowing.find(userID => {
					return userID === request.body.unfollowUser
				});
				if (userFollowing) {
					profileUser.usersFollowing = profileUser.usersFollowing.filter(u => u !== userFollowing)
					response.status(200)
					response.redirect("/profile");
				} else
					response.status(401).send("Error, you are not following this user");
			} else if (request.body.hasOwnProperty("followUser")) {
				let userFollowing = profileUser.usersFollowing.find(userID => {
					return userID === request.body.followUser
				});
				if (!userFollowing) {
					let followUser = usersArray.find(obj => {
						return obj.uID === request.body.followUser
					});
					profileUser.usersFollowing.push(followUser.uID);
					response.status(200)
					response.redirect("/profile");
				}
				else 
					response.status(401).send("Error, you are already following this user");
			}
		} else
			response.status(401).send("Not logged in.");
	});
app.put("/users/:uID/watchlist", (request, response) => {

		const filter = { _id: request.params.uID }
		const update = { "$push": { "watchlist": request.params.mID } }
		User.findOneAndUpdate(filter, update, { new: true }, (err, result) => {
			console.log(result);
		})
		// Get user making request
		let profileUser = usersArray.find(obj => {
			return obj.uID === request.session.username
		})
		// Check which button the user clicked and update its watchlist array accordingly
		if (profileUser) {
			if (request.body.hasOwnProperty("removeMovie")) {
				let movieWatched = profileUser.watchlist.find(obj => {
					return obj.mID == request.body.removeMovie
				});
				if (movieWatched) {
					profileUser.watchlist = profileUser.watchlist.filter(m => m != movieWatched)
				} else {
					response.status(401).send("Error, you do not have this movie in your watchlist");
					return;
				}
			}
			else if (request.body.hasOwnProperty("addMovie")) {
				let movieWatched = profileUser.watchlist.find(obj => {
					return obj.mID == request.body.addMovie
				});
				if (!movieWatched) {
					let targetMovie = moviesArray.find(obj => {
						return obj.mID == request.body.addMovie
					});
					profileUser.watchlist.push(targetMovie);
				} else {
					response.status(401).send("Error, you already have this movie in your watchlist");
					return;
				}
			}
			// Get recommendations according to genres in user's watchlist movies
			if (profileUser.watchlist.length > 0) {
				profileUser.recommended = [];
				let preferredGenres = [];
				profileUser.watchlist.forEach(watched => {
					watched.Genre.forEach(gen => {
						if (!preferredGenres.includes(gen))
							preferredGenres.push(gen)
					});
				});
				preferredGenres.forEach(prefer => {
					let similar = moviesArray.find(movie => {
						return !profileUser.watchlist.includes(movie) && !profileUser.recommended.includes(movie) && movie.Genre.includes(prefer);
					});
					if (similar && profileUser.recommended.length <= 3)
						profileUser.recommended.push(similar);
				});
			}
			response.status(200)
			response.redirect("/profile");
		} else
			response.status(401).send("Not logged in.");
	});
app.put("/users/:uID/notifications", (request, response) => {
		// Get user making request
		let profileUser = usersArray.find(obj => {
			return obj.uID === request.session.username
		})
		// Remove notification selected
		if (profileUser) {
			profileUser.notifications = profileUser.notifications.filter(n => n !== request.body.notification)
			response.status(200)
			response.redirect("/profile");
		} else
			response.status(401).send("Not logged in.");
	});

// People requests
app
	.route("/people")
	// Get all people who match query request
	.get((request, response) => {
		let matches = peopleArray.filter(person => {
			return person.pID.toLowerCase().includes(request.query.pID.toLowerCase());
		});
		matches = matches.sort((a, b) => a.pID < b.pID);
		matches = matches.slice(0, 10);
		response.status(200);
		response.send(pug.renderFile("./pages/peopleResults.pug", { matches: matches }));
	})
	// Add a new actor to the database
	.post((request, response) => {
		// Check if actor is already in database, if not create a new people object
		let found = peopleArray.find(obj => {
			return obj.pID.toLowerCase() === request.body.actor.toLowerCase()
		});
		if (!found) {
			let newActor = {
				pID: request.body.actor,
				works: [],
				collabs: [],
			};
			peopleArray.push(newActor);
			response.status(200)
			response.redirect("/people/" + newActor.pID);
		} else 
			response.status(401).send("That person is already in this database.");
	});
app
	.route("/people/:pID")
	// Get specific person and display their page
	.get((request, response) => {
		// Check if a person with the specified ID exists
		let targetPerson = peopleArray.find(obj => {
			return obj.pID === request.params.pID
		})
		if (targetPerson) {
			if (request.session.username)
				response.status(200).send(pug.renderFile("./pages/person.pug", {person: targetPerson, profile: request.session.username }));
			else
				response.status(200).send(pug.renderFile("./pages/person.pug", { person: targetPerson }));
			
		} else {
			response.status(404).send(`Person with ID ${request.params.pID} does not exist.`);
		}
	})

// Review requests
// Get specific review and display their page
app.get("/reviews/:rID", (request, response) => {
	// Check if a review with the specified ID exists
	let targetReview = reviewsArray.find(obj => {
		return obj.rID == request.params.rID
	})
	if (targetReview) {
		// Create user object to display reviewer attributes on review page
		let targetUser = usersArray.find(obj => {
			return obj.uID === targetReview.reviewer
		})
		// Create movie object to display movie attributes on review page
		let targetMovie = moviesArray.find(obj => {
			return obj.mID == targetReview.movie
		})
		response.status(200).send(pug.renderFile("./pages/review.pug", { review: targetReview, reviewer: targetUser, movie: targetMovie }));
	} else {
		response.status(404).send(`Review with ID ${request.params.rID} does not exist.`);
	}
});
// Add a new review to database
app.post("/reviews", (request, response) => {
	let movieReviewed = moviesArray.find(obj => {
		return obj.mID == request.body.movie
	});
	let movieReviewer = usersArray.find(obj => {
		return obj.uID === request.body.reviewer
	});
	let newReview = {
		rID: reviewsArray.length+1,
		movie: request.body.movie,
		reviewer: request.body.reviewer,
		rating: parseInt(request.body.rating),
		summary: request.body.breif,
		full: request.body.review
	}
	movieReviewed.Reviews.push(newReview.rID);
	movieReviewer.reviews.push(newReview.rID);
	reviewsArray.push(newReview);
	// Alert all users following user who wrote newReview
	usersArray.forEach(user => {
		user.usersFollowing.forEach(following => {
			if (newReview.reviewer == following)
				user.notifications.push(newReview.reviewer + " added a new review");
		});
	});
	//Compute average rating for movieReviewed
	let avr = 0;
	movieReviewed.Reviews.forEach(reviewID => {
		let rev = reviewsArray.find(obj => {
			return obj.rID == reviewID
		});
		avr += rev.rating;
	});
	avr /= movieReviewed.Reviews.length;
	movieReviewed.AverageRating = avr.toFixed(2);
	response.status(200);
	response.redirect("/movies/" + movieReviewed.mID);
	});

// Creates new user object
function signup(request, response) {
	if (request.session.loggedin) {
		response.status(401).send("Already logged in.");
	 	return;
	}
  
	let username = request.body.username;
	let password = request.body.password;
  
	// Check if a user with the specified ID exists
	let targetUser = usersArray.find(obj => {
		return obj.uID.toLowerCase() === username.toLowerCase()
	})
	if (targetUser) {
		response.status(401).send("Username already exists");
	  	return;
	}
	else {
		let newUser = {
			uID: username,
			password: password,
			type: "regular",
			reviews: [],
			peopleFollowing: [],
			usersFollowing: [],
			followers: [],
			watchlist: [],
			recommended: [],
			notifications: [],
		}
		usersArray.push(newUser);
		request.session.loggedin = true;
		request.session.username = username;
		response.redirect("/profile");
	}
}

function login(request, response) {
	if (session.loggedin) {
		response.status(401).send("Already logged in.");
	 	return;
	}
	let logInUser = request.body
	console.log(logInUser);
	
	// Check if a user with the specified ID exists
	User.findOne({ username: logInUser.username, password: logInUser.password }).exec((err, user) => {
		if (err) response.status(401).send("Entered wrong credentials")

		request.session.username = user.username
		request.session.uID = user._id.toString()
		request.session.loggedin = true
		session.loggedin = true
		console.log(request.session);
		console.log("Found user: " + user.username);
		response.redirect(`/users/${user._id.toString()}`)
	})
	// let targetUser = usersArray.find(obj => {
	// 	return obj.uID === username
	// })
	// if (!targetUser) {
	// 	response.status(401).send("Unauthorized");
	//   	return;
	// }
	// else if (targetUser.password === password) {
	// 	request.session.loggedin = true;
	// 	request.session.username = username;
	// 	response.redirect("/profile");
	// } else
	// 	response.status(401).send("Not authorized. Invalid password.");
	
}

function logout(request, response) {
	if (request.session.loggedin) {
		// Find user currently logged in
		let targetUser = usersArray.find(obj => {
			return obj.uID === request.session.username
		});
		request.session.loggedin = false;
		request.session.username = "";
		response.redirect("/");
	} else {
		response.status(401).send("Not logged in");
		return;
	}
}

//Helper function for determining whether a movie
// matches the query parameters. Compares the title,
// actor, and genre. All must be true.
function movieMatch (movie, query) {
	let titleCheck = !query.Title || movie.Title.toLowerCase().includes(query.Title.toLowerCase());
	let actorCheck = !query.Actor || movie.Actors.find(obj => { return obj.pID.toLowerCase().includes(query.Actor.toLowerCase()) });
	let genreCheck = !query.Genre || movie.Genre.find(obj => { return obj.toLowerCase() == query.Genre.toLowerCase() });
	return titleCheck && actorCheck && genreCheck;
}

mongoose.connect('mongodb://localhost/movieDB', { useNewUrlParser: true });
let db = mongoose.connection;
db.on("error", console.error.bind(console, 'connection error:'));
db.once('open', function () {
	app.listen(port);
	console.log("Server listening at http://localhost:3000");
});
