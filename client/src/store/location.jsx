import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getEvents } from "../utils/eventApi.js";

const STORAGE_KEY = "tickethub_location";

const popularCities = [
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Bangalore", state: "Karnataka" },
  { name: "Delhi", state: "Delhi" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Kolkata", state: "West Bengal" },
];

const otherCities = [
  { name: "Agartala", state: "Tripura" },
  { name: "Agra", state: "Uttar Pradesh" },
  { name: "Ahmednagar", state: "Maharashtra" },
  { name: "Ajmer", state: "Rajasthan" },
  { name: "Akola", state: "Maharashtra" },
  { name: "Aligarh", state: "Uttar Pradesh" },
  { name: "Allahabad", state: "Uttar Pradesh" },
  { name: "Alwar", state: "Rajasthan" },
  { name: "Amravati", state: "Maharashtra" },
  { name: "Amritsar", state: "Punjab" },
  { name: "Anand", state: "Gujarat" },
  { name: "Asansol", state: "West Bengal" },
  { name: "Aurangabad", state: "Maharashtra" },
  { name: "Bareilly", state: "Uttar Pradesh" },
  { name: "Belgaum", state: "Karnataka" },
  { name: "Bhavnagar", state: "Gujarat" },
  { name: "Bhilai", state: "Chhattisgarh" },
  { name: "Bhilwara", state: "Rajasthan" },
  { name: "Bhiwandi", state: "Maharashtra" },
  { name: "Bhubaneswar", state: "Odisha" },
  { name: "Bhuj", state: "Gujarat" },
  { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Bikaner", state: "Rajasthan" },
  { name: "Bilaspur", state: "Chhattisgarh" },
  { name: "Bokaro", state: "Jharkhand" },
  { name: "Calicut", state: "Kerala" },
  { name: "Chandigarh", state: "Chandigarh" },
  { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Cuttack", state: "Odisha" },
  { name: "Darbhanga", state: "Bihar" },
  { name: "Dehradun", state: "Uttarakhand" },
  { name: "Dhanbad", state: "Jharkhand" },
  { name: "Dharwad", state: "Karnataka" },
  { name: "Durg", state: "Chhattisgarh" },
  { name: "Durgapur", state: "West Bengal" },
  { name: "Erode", state: "Tamil Nadu" },
  { name: "Faridabad", state: "Haryana" },
  { name: "Gandhinagar", state: "Gujarat" },
  { name: "Ghaziabad", state: "Uttar Pradesh" },
  { name: "Goa", state: "Goa" },
  { name: "Gorakhpur", state: "Uttar Pradesh" },
  { name: "Guntur", state: "Andhra Pradesh" },
  { name: "Gurgaon", state: "Haryana" },
  { name: "Guwahati", state: "Assam" },
  { name: "Gwalior", state: "Madhya Pradesh" },
  { name: "Hisar", state: "Haryana" },
  { name: "Hubli", state: "Karnataka" },
  { name: "Imphal", state: "Manipur" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Jabalpur", state: "Madhya Pradesh" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Jalandhar", state: "Punjab" },
  { name: "Jalgaon", state: "Maharashtra" },
  { name: "Jammu", state: "Jammu and Kashmir" },
  { name: "Jamnagar", state: "Gujarat" },
  { name: "Jamshedpur", state: "Jharkhand" },
  { name: "Jhansi", state: "Uttar Pradesh" },
  { name: "Jodhpur", state: "Rajasthan" },
  { name: "Junagadh", state: "Gujarat" },
  { name: "Kakinada", state: "Andhra Pradesh" },
  { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Karimnagar", state: "Telangana" },
  { name: "Karnal", state: "Haryana" },
  { name: "Kochi", state: "Kerala" },
  { name: "Kolhapur", state: "Maharashtra" },
  { name: "Kollam", state: "Kerala" },
  { name: "Kota", state: "Rajasthan" },
  { name: "Kozhikode", state: "Kerala" },
  { name: "Kurnool", state: "Andhra Pradesh" },
  { name: "Latur", state: "Maharashtra" },
  { name: "Ludhiana", state: "Punjab" },
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Madurai", state: "Tamil Nadu" },
  { name: "Mangalore", state: "Karnataka" },
  { name: "Meerut", state: "Uttar Pradesh" },
  { name: "Moradabad", state: "Uttar Pradesh" },
  { name: "Mysore", state: "Karnataka" },
  { name: "Muzaffarpur", state: "Bihar" },
  { name: "Nadiad", state: "Gujarat" },
  { name: "Nagpur", state: "Maharashtra" },
  { name: "Nanded", state: "Maharashtra" },
  { name: "Nashik", state: "Maharashtra" },
  { name: "Nellore", state: "Andhra Pradesh" },
  { name: "Noida", state: "Uttar Pradesh" },
  { name: "Patiala", state: "Punjab" },
  { name: "Patna", state: "Bihar" },
  { name: "Pondicherry", state: "Puducherry" },
  { name: "Prayagraj", state: "Uttar Pradesh" },
  { name: "Raipur", state: "Chhattisgarh" },
  { name: "Rajahmundry", state: "Andhra Pradesh" },
  { name: "Rajkot", state: "Gujarat" },
  { name: "Ranchi", state: "Jharkhand" },
  { name: "Rohtak", state: "Haryana" },
  { name: "Rourkela", state: "Odisha" },
  { name: "Salem", state: "Tamil Nadu" },
  { name: "Sangli", state: "Maharashtra" },
  { name: "Siliguri", state: "West Bengal" },
  { name: "Solapur", state: "Maharashtra" },
  { name: "Srinagar", state: "Jammu and Kashmir" },
  { name: "Surat", state: "Gujarat" },
  { name: "Thane", state: "Maharashtra" },
  { name: "Thiruvananthapuram", state: "Kerala" },
  { name: "Thrissur", state: "Kerala" },
  { name: "Tiruchirappalli", state: "Tamil Nadu" },
  { name: "Tirunelveli", state: "Tamil Nadu" },
  { name: "Tiruppur", state: "Tamil Nadu" },
  { name: "Udaipur", state: "Rajasthan" },
  { name: "Ujjain", state: "Madhya Pradesh" },
  { name: "Vadodara", state: "Gujarat" },
  { name: "Valsad", state: "Gujarat" },
  { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Vasai", state: "Maharashtra" },
  { name: "Vellore", state: "Tamil Nadu" },
  { name: "Vijayawada", state: "Andhra Pradesh" },
  { name: "Visakhapatnam", state: "Andhra Pradesh" },
  { name: "Warangal", state: "Telangana" },
];

const knownCities = [...popularCities, ...otherCities];

const normalizeCity = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const readStoredLocation = () => {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    console.error("Unable to read stored location", error);
    return null;
  }
};

const persistLocation = (location) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
};

const getCityFromEvent = (event = {}) => ({
  name: event.city || "",
  state: event.state || "",
});

const mapCityToKnownOption = (city = {}) => {
  const normalizedName = normalizeCity(city.name);

  if (!normalizedName) {
    return city;
  }

  return (
    knownCities.find((option) => normalizeCity(option.name) === normalizedName) || city
  );
};

const reverseGeocode = async (latitude, longitude) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to reverse geocode location");
  }

  const data = await response.json();
  const address = data.address;

  if (!address) {
    throw new Error("No matching city found");
  }

  const city =
    address.city ||
    address.town ||
    address.county ||
    address.state_district ||
    address.village;
  const state = address.state || address.region || "";

  if (!city) {
    throw new Error("Unable to determine city");
  }

  return { name: city, state };
};

const detectLocationByIp = async () => {
  const response = await fetch("https://ipapi.co/json/");

  if (!response.ok) {
    throw new Error("Unable to detect IP location");
  }

  const data = await response.json();

  if (!data.city) {
    throw new Error("No IP city found");
  }

  return {
    name: data.city,
    state: data.region || data.region_code || "",
  };
};

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState(readStoredLocation());
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadAvailableCities = async () => {
      try {
        const events = await getEvents({ limit: 200 });
        const seenCities = new Set();
        const cityOptions = [];

        events.forEach((event) => {
          const city = getCityFromEvent(event);
          const normalizedName = normalizeCity(city.name);

          if (!normalizedName || seenCities.has(normalizedName)) {
            return;
          }

          seenCities.add(normalizedName);

          const knownCity = mapCityToKnownOption(city);

          cityOptions.push({
            name: knownCity.name,
            state: knownCity.state || city.state || "",
          });
        });

        if (!ignore) {
          setAvailableCities(cityOptions);

          if (!selectedLocation && cityOptions.length) {
            setSelectedLocation(cityOptions[0]);
            persistLocation(cityOptions[0]);
          }
        }
      } catch (error) {
        if (!ignore) {
          setAvailableCities([]);
        }
      }
    };

    loadAvailableCities();

    return () => {
      ignore = true;
    };
  }, []);

  const allCities = useMemo(() => {
    const merged = [...popularCities, ...otherCities, ...availableCities];
    const seen = new Set();

    return merged.filter((city) => {
      const normalizedName = normalizeCity(city.name);

      if (!normalizedName || seen.has(normalizedName)) {
        return false;
      }

      seen.add(normalizedName);
      return true;
    });
  }, [availableCities]);

  const chooseCity = useCallback((city) => {
    const nextLocation = mapCityToKnownOption(city);
    setSelectedLocation(nextLocation);
    persistLocation(nextLocation);
    toast.success(`${nextLocation.name} selected`);
  }, []);

  const detectCurrentLocation = useCallback(async () => {
    setIsDetectingLocation(true);

    try {
      let detectedLocation = null;

      if (navigator.geolocation) {
        try {
          detectedLocation = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  const city = await reverseGeocode(position.coords.latitude, position.coords.longitude);
                  resolve(city);
                } catch (error) {
                  reject(error);
                }
              },
              (error) => reject(error),
              {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 300000,
              }
            );
          });
        } catch (error) {
          console.error("Browser geolocation failed", error);
        }
      }

      if (!detectedLocation) {
        try {
          detectedLocation = await detectLocationByIp();
        } catch (error) {
          console.error("IP location fallback failed", error);
        }
      }

      if (!detectedLocation) {
        throw new Error("Unable to detect location");
      }

      chooseCity(detectedLocation);
      return detectedLocation;
    } catch (error) {
      toast.error("Location detection failed. Please select your city manually.");
      return null;
    } finally {
      setIsDetectingLocation(false);
    }
  }, [chooseCity]);

  const value = useMemo(
    () => ({
      allCities,
      chooseCity,
      detectCurrentLocation,
      isDetectingLocation,
      popularCities,
      selectedLocation: selectedLocation || { name: "Select City", state: "Choose location" },
    }),
    [allCities, chooseCity, detectCurrentLocation, isDetectingLocation, selectedLocation]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocationStore = () => useContext(LocationContext);

export const filterItemsByLocation = (items = [], selectedLocation) => {
  if (!selectedLocation?.name || selectedLocation.name === "Select City") {
    return items;
  }

  const selectedCity = normalizeCity(selectedLocation.name);
  const matchingItems = items.filter((item) => {
    const itemCity = normalizeCity(item.city || "");
    return itemCity === selectedCity;
  });

  return matchingItems.length ? matchingItems : items;
};
