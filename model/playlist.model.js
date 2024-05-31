import mongoose from 'mongoose'

const movieSchema = new mongoose.Schema({
    Title: {
        type: String,
        required: true
    },
    Year: {
        type: String,
        required: true
    },
    imdbID: {
        type: String,
        required: true
    },
    Type: {
        type: String,
        required: true
    },
    Poster: {
        type: String,
        required: true
    },
});

const playListSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    name : {
        type : String,
        required : true
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    movies: [movieSchema] 
}, { timestamps: true });

const Playlist = mongoose.model('Playlist', playListSchema);

export default Playlist;
