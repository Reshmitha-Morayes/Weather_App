const mongoose = require('mongoose');

const WeatherSchema = new mongoose.Schema({
    
    city: String,
    temperature: Number,
    condition: String,
    date: { type: Date, default: Date.now },
    email: String
})

const WeatherModel = mongoose.model("info", WeatherSchema)
module.exports = WeatherModel