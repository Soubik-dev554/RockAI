const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

export const getCurrentWeather = async (latitude, longitude) => {
    try {
        const url = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to fetch weather data.");
        }

        const data = await response.json();

        return {
            success: true,
            location: {
                latitude,
                longitude,
                timezone: data.timezone
            },
            current: data.current,
            today: {
                maxTemperature: data.daily.temperature_2m_max[0],
                minTemperature: data.daily.temperature_2m_min[0],
                rainProbability: data.daily.precipitation_probability_max[0]
            }
        };


    } catch (error) {
        console.error("Weather Service Error:", error);

        return {
            success: false,
            error: error.message
        };
    }
};

// Get weather for a specific city or location
export const getWeatherByCity = async (cityName) => {
    try {
        if (!cityName || cityName.trim().length < 2) {
            throw new Error("Please provide a valid city name.");
        }

        // Step 1: Find city coordinates
        const geoUrl = new URL(
            "https://geocoding-api.open-meteo.com/v1/search"
        );

        geoUrl.search = new URLSearchParams({
            name: cityName.trim(),
            count: "5",
            language: "en",
            format: "json"
        });

        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error("Unable to find this location.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Location not found. Try another city name.");
        }

        // Select the best matching location
        const city = geoData.results[0];

        const {
            name,
            latitude,
            longitude,
            country,
            admin1,
            timezone
        } = city;

        // Step 2: Get weather using coordinates
        const weather = await getCurrentWeather(
            latitude,
            longitude
        );

        if (!weather.success) {
            throw new Error(weather.error || "Unable to fetch weather.");
        }

        // Step 3: Return complete result
        return {
            success: true,

            location: {
                name,
                state: admin1 || null,
                country,
                latitude,
                longitude,
                timezone
            },

            current: weather.current,
            today: weather.today
        };

    } catch (error) {
        console.error("City Weather Error:", error);

        return {
            success: false,
            error: error.message
        };
    }
};