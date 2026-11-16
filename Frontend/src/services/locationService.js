export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {

        // Check browser geolocation support
        if (!navigator.geolocation) {
            reject(new Error(
                "Geolocation is not supported by this browser."
            ));
            return;
        }

        console.log("Requesting current GPS location...");

        navigator.geolocation.getCurrentPosition(

            // SUCCESS CALLBACK
            async (position) => {
                try {
                    // Get GPS coordinates
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    // Check location accuracy
                    if (accuracy > 1000) {
                        console.warn(
                            "Location is approximate. Accuracy:",
                            accuracy,
                            "meters"
                        );
                    }
                    // GPS debugging information
                    console.log("========== GPS INFORMATION ==========");
                    console.log("GPS POSITION:", position);
                    console.log("LATITUDE:", latitude);
                    console.log("LONGITUDE:", longitude);
                    console.log("ACCURACY:", accuracy, "meters");
                    console.log("=====================================");

                    // Check GPS accuracy
                    if (accuracy <= 50) {
                        console.log("GPS accuracy: Good");
                    } else if (accuracy <= 200) {
                        console.log("GPS accuracy: Moderate");
                    } else if (accuracy <= 1000) {
                        console.warn("GPS accuracy: Poor");
                    } else {
                        console.warn("GPS accuracy: Very poor");
                    }

                    // Reverse geocoding API
                    console.log("Requesting address from OpenStreetMap...");

                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
                    );

                    if (!response.ok) {
                        throw new Error(
                            `Geocoding API error: ${response.status}`
                        );
                    }

                    const data = await response.json();

                    // Reverse geocoding debugging
                    console.log(
                        "========== ADDRESS INFORMATION =========="
                    );

                    console.log("REVERSE GEOCODING RESPONSE:", data);
                    console.log("DETECTED ADDRESS:", data.display_name);
                    console.log("ADDRESS DETAILS:", data.address);

                    console.log(
                        "=========================================="
                    );

                    const address = data.address || {};

                    // Extract location details
                    const location = {
                        latitude,
                        longitude,
                        accuracy,

                        village:
                            address.village ||
                            address.hamlet ||
                            address.locality ||
                            address.suburb ||
                            address.neighbourhood ||
                            null,

                        town:
                            address.town ||
                            address.city ||
                            address.municipality ||
                            null,

                        district:
                            address.state_district ||
                            address.county ||
                            null,

                        state: address.state || null,

                        country: address.country || null,

                        postcode: address.postcode || null,

                        fullAddress: data.display_name || null
                    };

                    console.log("FINAL LOCATION RESULT:", location);

                    resolve(location);

                } catch (error) {
                    console.error(
                        "LOCATION PROCESSING ERROR:",
                        error
                    );

                    reject(error);
                }
            },

            // ERROR CALLBACK
            (error) => {

                console.error("========== GPS ERROR ==========");

                console.error("ERROR CODE:", error.code);
                console.error("ERROR MESSAGE:", error.message);

                console.error("================================");

                const errorMessages = {
                    1: "Location permission denied. Please allow location access.",
                    2: "Current location is unavailable.",
                    3: "Location request timed out."
                };

                reject(
                    new Error(
                        errorMessages[error.code] ||
                        "Unable to retrieve current location."
                    )
                );
            },

            // GPS OPTIONS
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            }
        );
    });
};