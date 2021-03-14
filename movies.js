var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error) {
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//movies schema
var MoviesSchema = new Schema({
    Title: String,
    YearReleased: String,
    Genre: String,
    Actors: Array
});

//return the model to server
module.exports = mongoose.model('Movies', MoviesSchema);