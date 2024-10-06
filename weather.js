const express = require('express');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const WeatherModel = require('./models/weatherData')

const port = process.env.PORT || 5000;
const app = express();
app.use(express.json())
const mongoose = require('mongoose');

require('dotenv').config()
// MongoDB Atlas connection URI
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});


app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Route to serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'weather.html'));
});



// Handle form submission
app.post('/search', async (req, res) => {
    const cityName = req.body.city;
    const apiKey = '5b37c8d7ad37b12058607218571a6326'; // Replace with your OpenWeatherMap API key
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;

    try {
        const response = await axios.get(apiUrl);
        const weatherData = response.data;

        const weatherCondition = weatherData.weather[0].main;
        let backgroundColor, textColor, weatherIcon;
        
        switch (weatherCondition) {
            case 'clear':
                weatherIcon = '<i class="fa-solid fa-sun" style="font-size: 170px; margin-top: 20px;"></i>';
                backgroundColor = '#FFD700';
                textColor = '#FF8C00';
                break;
            case 'clouds':
                weatherIcon = '<i class="fa-solid fa-cloud" style="font-size: 170px; margin-top: 20px;"></i>';
                backgroundColor = '#B0C4DE';
                textColor = '#708090';
                break;
            case 'rain':
                weatherIcon = '<i class="fa-solid fa-cloud-rain" style="font-size: 170px; margin-top: 20px;"></i>';
                backgroundColor = '#4682B4';
                textColor = '#2F4F4F';
                break;
            case 'storm':
                weatherIcon = '<i class="fa-solid fa-poo-storm" style="font-size: 170px;  margin-top: 20px;"></i>';
                backgroundColor = '#2F4F4F';
                textColor = '#696969';
                break;
            case 'snow':
                weatherIcon = '<i class="fa-solid fa-snowflake" style="font-size: 170px; margin-top: 20px;"></i>';
                backgroundColor = '#F0F8FF';
                textColor = '#4682B4';
                break;
            default:
                weatherIcon = '<i class="fa-solid fa-sun" style="font-size: 170px; margin-top: 20px;"></i>';
                backgroundColor = '#FFD700';
                textColor = '#FF8C00';
        }
        const Icon = weatherIcon;
        const temperature = (weatherData.main.temp - 273.15).toFixed(1);
        const city = weatherData.name;
        const email = req.body.email;
        //const weatherIcon = '<i class="fab fa-cloudflare" style="font-size: 170px; color: rgb(92, 92, 92);"></i>';

        let html = fs.readFileSync(path.join(__dirname, 'weather.html'), 'utf8');
        html = html.replace('{%temperature%}', `${temperature}°C`);
        html = html.replace('{%city%}', city);
        html = html.replace('{%weathericon%}', Icon)
                   .replace('{%weather%}', weatherCondition);
        html = html.replace('{%temperature%}' , `${textColor}; `)
                    .replace('#weathericon', `#weathericon { color: ${backgroundColor}}`);
        html = html.replace('{%email%}', email);
    
        // Save weather data to MongoDB
        const newWeatherData = new WeatherModel({
            city: city,
            temperature: parseFloat(temperature),
            condition: weatherCondition,
            email: email
        });

        await newWeatherData.save();
        res.send(html);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).send('Error fetching weather data');
    }
});



// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendWeatherEmail = (email, city, temperature, condition) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: req.body.email,
    subject: `Weather Update for ${city}`,
    text: `The current temperature in ${city} is ${temperature}°C and the weather condition is ${condition}.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

// Schedule email sending every hour
cron.schedule('0 * * * *', async () => {
  try {
    const weatherData = await WeatherModel.find({});
    weatherData.forEach((data) => {
      sendWeatherEmail(data.email, data.city, data.temperature, data.condition);
    });
  } catch (error) {
    console.error('Error fetching weather data:', error);
  }
});



app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
//mongodb string
//mongodb+srv://WeatherApp:weatherappinfo@projects.smsnj61.mongodb.net/
