import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import cors from 'cors';
import fetch from 'node-fetch';
import './database/conn.js';
import Playlist from './model/playlist.model.js'
import User from './model/users.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.set('view engine', 'ejs');
app.set('views', path.resolve('views'));  // Use path.resolve
app.use(express.static(path.resolve('public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: "*"
}));

app.use(session({
    name: "user_sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60, sameSite: true, secure: false, httpOnly: true }
}));

// Middleware for redirecting
const redirectHome = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/home');
    } else {
        next();
    }
};

const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login');
    } else {
        next();
    }
};

// Routes
app.get('/', redirectHome, (req, res) => {
    res.sendFile(path.resolve('public', 'index.html'));
});

app.get('/register', redirectHome, (req, res) => {
    res.sendFile(path.resolve('public', 'register.html'));
});

app.get('/login', redirectHome, (req, res) => {
    res.sendFile(path.resolve('public', 'login.html'));
});

app.get('/home', redirectLogin, (req, res) => {
    res.render('home.ejs');
});

app.post('/search', redirectLogin, async (req, res) => {    
    
    try {
        const searchTerm = req.body.searchTerm;
        const page = req.body.page
        const response = await fetch(`https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${encodeURIComponent(searchTerm)}&page=${page}`);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
});


app.post('/create/playlist',redirectLogin,async(req,res) => {
    const userId = req.session.userId
    try{
        const user = await User.findOne({_id : userId})
        if(!user){
            return res.status(400).send({"msg" : "invalid user"})
        }

        const isPrivate = req.body.isPrivate
        const name =  req.body.name

        const check = await Playlist.findOne({userId : userId,name : name})
        if(check){
            return res.status(400).send({"msg" : "playlist already exists"})
        }


        const playlist = await new Playlist({userId : userId,name:name,isPrivate : isPrivate,movies : []});
        await playlist.save()
        res.send({playlist : playlist})
    }   
    catch(e){
        console.log(e)
    }

})



app.post('/add/movie', redirectLogin, async (req, res) => {
    const userId = req.session.userId;
    try {
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(400).json({ "msg": "Invalid user." });
        }

        // Assuming req.body.playlistId is the ID of the playlist
        const playlist = await Playlist.findOne({ _id: req.body.playlist._id,userId : userId});
        if (playlist) {
            // Check if the playlist belongs to the user
            if (playlist.userId.toString() !== userId.toString()) {
                return res.status(403).json({ "msg": "Access denied." });
            }
            // Assuming req.body.movie is a complete movie object to be pushed to the playlist
            playlist.movies.push(req.body.movie);
            await playlist.save();
            return res.json({ movie: req.body.movie });
        } else {
            return res.status(404).json({ "msg": "No such playlist found." });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ "msg": "Server error." });
    }
});



app.get('/user/playlists',redirectLogin,async(req,res) => {
    const userId = req.session.userId
    console.log(userId)
    try{
        const user = await User.findOne({_id : userId})
        if(!user){
            return res.status(400).send({"msg" : "invalid user"})
        }
        try{
            const playlists = await Playlist.find({userId : user._id})
            res.send({playlists:playlists})
        }
        catch(e){
            console.log(e)
        }

    }
    catch(e){
        console.log(e)
    }
})

app.post('/delete/playlist',redirectLogin,async(req,res) =>{
    const userId = req.session.userId
    console.log(userId)
    try{
        const user = await User.findOne({_id : userId})
        if(!user){
            return res.status(400).send({"msg" : "invalid user"})
        }

        console.log(req.body)
        try{
            const playlists = await Playlist.deleteOne(req.body.playlist)
            res.status(200).send({"msg" : "playlist deleted successfully"})
        }
        catch(e){
            console.log(e)
        }

    }
    catch(e){
        console.log(e)
    }
})

app.post('/delete/movie', redirectLogin, async (req, res) => {
    const userId = req.session.userId;
    console.log(userId);  // Consider removing or securing this log for production.

    try {
        const user = await User.findOne({_id: userId});
        if (!user) {
            return res.status(400).json({"msg": "Invalid user"});
        }
        
        const playlist = await Playlist.findOne({_id: req.body.playlist._id, userId: userId});  // Ensure user owns the playlist.
        if (!playlist) {
            return res.status(404).json({"msg": "No such playlist"});
        }

        // Filter out the movie that needs to be deleted.
        const filteredMovies = playlist.movies.filter(mve => mve.imdbID !== req.body.movie.imdbID);
        if (playlist.movies.length === filteredMovies.length) {
            return res.status(404).json({"msg": "Movie not found in the playlist"});
        }

        console.log(filteredMovies);  // Consider removing this log for production.
        playlist.movies = filteredMovies;
        await playlist.save();

        res.status(200).json({"msg": "Movie deleted successfully"});
    } catch (e) {
        console.error(e);
        res.status(500).json({"msg": "Server error"});
    }
});




app.get('/playlist/:pId',async(req,res) => {
    const pId = req.params.pId

    
    const playlist = await Playlist.findOne({_id : pId})
    console.log(playlist)

    if(playlist && !playlist.isPrivate){
        return res.render(path.resolve('views', 'playlist.ejs'),{data : playlist})
    }
    return res.render(path.resolve('views', 'notFound.ejs'))
})




app.post("/login", redirectHome, async (req, res) => {
    const query = {
        $or: [
            { username: req.body.email },
            { Email: req.body.email },
        ]
    };

    try {
        const loggedUser = await User.findOne(query);
        if (loggedUser) {
            const isMatch = await bcrypt.compare(req.body.password, loggedUser.Password);
            if (isMatch) {
                req.session.userId = loggedUser.id;
                return res.sendStatus(200);
            } else {
                return res.sendStatus(401);
            }
        } else {
            return res.sendStatus(400);
        }
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
});

app.post("/register", redirectHome, async (req, res) => {
    try {
        const checkEmail = await User.findOne({ Email: req.body.email });
        const checkUsername = await User.findOne({ username: req.body.username });

        if (checkEmail) {
            res.status(409).json("Email already exists");
        } else if (checkUsername) {
            res.status(409).json("Username already exists");
        } else {
            const salt = await bcrypt.genSalt();
            const hashedPass = await bcrypt.hash(req.body.password, salt);
            const newUser = new User({ username: req.body.username, Email: req.body.email, Password: hashedPass });
            await newUser.save();
            req.session.userId = newUser.id;
            res.sendStatus(200);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.post('/logout', redirectLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/home');
        }
        res.clearCookie('user_sid');
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});
