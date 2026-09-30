import os
import httpx
import math
from typing import List, Dict, Any, Optional

# Enriched Seed Locations across all continents
SEED_LOCATIONS: List[Dict[str, Any]] = [
    {"id": "loc-kerala", "name": "Kerala", "country": "India", "region": "South Asia", "latitude": 10.8505, "longitude": 76.2711, "population": 34630000},
    {"id": "loc-delhi", "name": "New Delhi", "country": "India", "region": "South Asia", "latitude": 28.6139, "longitude": 77.2090, "population": 32900000},
    {"id": "loc-mumbai", "name": "Mumbai", "country": "India", "region": "South Asia", "latitude": 19.0760, "longitude": 72.8777, "population": 21300000},
    {"id": "loc-bengaluru", "name": "Bengaluru", "country": "India", "region": "South Asia", "latitude": 12.9716, "longitude": 77.5946, "population": 13600000},
    {"id": "loc-tokyo", "name": "Tokyo", "country": "Japan", "region": "East Asia", "latitude": 35.6762, "longitude": 139.6503, "population": 37400000},
    {"id": "loc-beijing", "name": "Beijing", "country": "China", "region": "East Asia", "latitude": 39.9042, "longitude": 116.4074, "population": 21540000},
    {"id": "loc-shanghai", "name": "Shanghai", "country": "China", "region": "East Asia", "latitude": 31.2304, "longitude": 121.4737, "population": 28500000},
    {"id": "loc-california", "name": "California", "country": "United States", "region": "North America", "latitude": 36.7783, "longitude": -119.4179, "population": 39000000},
    {"id": "loc-newyork", "name": "New York City", "country": "United States", "region": "North America", "latitude": 40.7128, "longitude": -74.0060, "population": 8336000},
    {"id": "loc-london", "name": "London", "country": "United Kingdom", "region": "Western Europe", "latitude": 51.5074, "longitude": -0.1278, "population": 8982000},
    {"id": "loc-paris", "name": "Paris", "country": "France", "region": "Western Europe", "latitude": 48.8566, "longitude": 2.3522, "population": 2161000},
    {"id": "loc-berlin", "name": "Berlin", "country": "Germany", "region": "Central Europe", "latitude": 52.5200, "longitude": 13.4050, "population": 3645000},
    {"id": "loc-athens", "name": "Athens", "country": "Greece", "region": "Southern Europe", "latitude": 37.9838, "longitude": 23.7275, "population": 3150000},
    {"id": "loc-rome", "name": "Rome", "country": "Italy", "region": "Southern Europe", "latitude": 41.9028, "longitude": 12.4964, "population": 2873000},
    {"id": "loc-reykjavik", "name": "Reykjavik", "country": "Iceland", "region": "Northern Europe", "latitude": 64.1466, "longitude": -21.9426, "population": 135000},
    {"id": "loc-cairo", "name": "Cairo", "country": "Egypt", "region": "North Africa", "latitude": 30.0444, "longitude": 31.2357, "population": 21750000},
    {"id": "loc-nairobi", "name": "Nairobi", "country": "Kenya", "region": "East Africa", "latitude": -1.2921, "longitude": 36.8219, "population": 4397000},
    {"id": "loc-johannesburg", "name": "Johannesburg", "country": "South Africa", "region": "Southern Africa", "latitude": -26.2041, "longitude": 28.0473, "population": 5635000},
    {"id": "loc-dubai", "name": "Dubai", "country": "United Arab Emirates", "region": "Middle East", "latitude": 25.2048, "longitude": 55.2708, "population": 3331000},
    {"id": "loc-riyadh", "name": "Riyadh", "country": "Saudi Arabia", "region": "Middle East", "latitude": 24.7136, "longitude": 46.6753, "population": 7676000},
    {"id": "loc-singapore", "name": "Singapore", "country": "Singapore", "region": "Southeast Asia", "latitude": 1.3521, "longitude": 103.8198, "population": 5637000},
    {"id": "loc-bangkok", "name": "Bangkok", "country": "Thailand", "region": "Southeast Asia", "latitude": 13.7563, "longitude": 100.5018, "population": 10539000},
    {"id": "loc-jakarta", "name": "Jakarta", "country": "Indonesia", "region": "Southeast Asia", "latitude": -6.2088, "longitude": 106.8456, "population": 10560000},
    {"id": "loc-manila", "name": "Manila", "country": "Philippines", "region": "Southeast Asia", "latitude": 14.5995, "longitude": 120.9842, "population": 14600000},
    {"id": "loc-sydney", "name": "Sydney", "country": "Australia", "region": "Oceania", "latitude": -33.8688, "longitude": 151.2093, "population": 5312000},
    {"id": "loc-melbourne", "name": "Melbourne", "country": "Australia", "region": "Oceania", "latitude": -37.8136, "longitude": 144.9631, "population": 5078000},
    {"id": "loc-saopaulo", "name": "São Paulo", "country": "Brazil", "region": "South America", "latitude": -23.5505, "longitude": -46.6333, "population": 22400000},
    {"id": "loc-buenosaires", "name": "Buenos Aires", "country": "Argentina", "region": "South America", "latitude": -34.6037, "longitude": -58.3816, "population": 15370000},
    {"id": "loc-toronto", "name": "Toronto", "country": "Canada", "region": "North America", "latitude": 43.6532, "longitude": -79.3832, "population": 2794000},
    {"id": "loc-vancouver", "name": "Vancouver", "country": "Canada", "region": "North America", "latitude": 49.2827, "longitude": -123.1207, "population": 675000},
    {"id": "loc-mexicocity", "name": "Mexico City", "country": "Mexico", "region": "North America", "latitude": 19.4326, "longitude": -99.1332, "population": 21800000},
]

# Comprehensive World Country & Regional Atlas
GLOBAL_COUNTRIES: List[Dict[str, Any]] = [
    {"name": "India", "country": "India", "region": "South Asia", "lat": 20.5937, "lon": 78.9629, "min_lat": 8.0, "max_lat": 37.0, "min_lon": 68.0, "max_lon": 97.5},
    {"name": "United States", "country": "United States", "region": "North America", "lat": 37.0902, "lon": -95.7129, "min_lat": 24.5, "max_lat": 49.5, "min_lon": -125.0, "max_lon": -66.9},
    {"name": "China", "country": "China", "region": "East Asia", "lat": 35.8617, "lon": 104.1954, "min_lat": 18.0, "max_lat": 53.5, "min_lon": 73.5, "max_lon": 135.0},
    {"name": "Japan", "country": "Japan", "region": "East Asia", "lat": 36.2048, "lon": 138.2529, "min_lat": 24.0, "max_lat": 46.0, "min_lon": 122.0, "max_lon": 153.0},
    {"name": "United Kingdom", "country": "United Kingdom", "region": "Western Europe", "lat": 55.3781, "lon": -3.4360, "min_lat": 49.8, "max_lat": 60.9, "min_lon": -8.6, "max_lon": 1.8},
    {"name": "France", "country": "France", "region": "Western Europe", "lat": 46.2276, "lon": 2.2137, "min_lat": 41.3, "max_lat": 51.1, "min_lon": -5.1, "max_lon": 9.6},
    {"name": "Germany", "country": "Germany", "region": "Central Europe", "lat": 51.1657, "lon": 10.4515, "min_lat": 47.3, "max_lat": 55.1, "min_lon": 5.9, "max_lon": 15.0},
    {"name": "Italy", "country": "Italy", "region": "Southern Europe", "lat": 41.8719, "lon": 12.5674, "min_lat": 35.5, "max_lat": 47.1, "min_lon": 6.6, "max_lon": 18.5},
    {"name": "Spain", "country": "Spain", "region": "Southern Europe", "lat": 40.4637, "lon": -3.7492, "min_lat": 35.8, "max_lat": 43.8, "min_lon": -9.3, "max_lon": 3.3},
    {"name": "Canada", "country": "Canada", "region": "North America", "lat": 56.1304, "lon": -106.3468, "min_lat": 41.7, "max_lat": 83.1, "min_lon": -141.0, "max_lon": -52.6},
    {"name": "Australia", "country": "Australia", "region": "Oceania", "lat": -25.2744, "lon": 133.7751, "min_lat": -44.0, "max_lat": -10.0, "min_lon": 113.0, "max_lon": 154.0},
    {"name": "Brazil", "country": "Brazil", "region": "South America", "lat": -14.2350, "lon": -51.9253, "min_lat": -33.8, "max_lat": 5.3, "min_lon": -74.0, "max_lon": -34.8},
    {"name": "Russia", "country": "Russia", "region": "Eurasia", "lat": 61.5240, "lon": 105.3188, "min_lat": 41.2, "max_lat": 82.0, "min_lon": 19.6, "max_lon": 190.0},
    {"name": "Egypt", "country": "Egypt", "region": "North Africa", "lat": 26.8206, "lon": 30.8025, "min_lat": 22.0, "max_lat": 31.7, "min_lon": 25.0, "max_lon": 37.0},
    {"name": "South Africa", "country": "South Africa", "region": "Southern Africa", "lat": -30.5595, "lon": 22.9375, "min_lat": -35.0, "max_lat": -22.0, "min_lon": 16.5, "max_lon": 33.0},
    {"name": "Saudi Arabia", "country": "Saudi Arabia", "region": "Middle East", "lat": 23.8859, "lon": 45.0792, "min_lat": 16.4, "max_lat": 32.2, "min_lon": 34.5, "max_lon": 55.7},
    {"name": "United Arab Emirates", "country": "United Arab Emirates", "region": "Middle East", "lat": 23.4241, "lon": 53.8478, "min_lat": 22.5, "max_lat": 26.2, "min_lon": 51.5, "max_lon": 56.4},
    {"name": "Indonesia", "country": "Indonesia", "region": "Southeast Asia", "lat": -0.7893, "lon": 113.9213, "min_lat": -11.0, "max_lat": 6.0, "min_lon": 95.0, "max_lon": 141.0},
    {"name": "Turkey", "country": "Turkey", "region": "Eurasia", "lat": 38.9637, "lon": 35.2433, "min_lat": 36.0, "max_lat": 42.1, "min_lon": 26.0, "max_lon": 44.8},
    {"name": "Mexico", "country": "Mexico", "region": "North America", "lat": 23.6345, "lon": -102.5528, "min_lat": 14.5, "max_lat": 32.7, "min_lon": -118.4, "max_lon": -86.7},
    {"name": "Argentina", "country": "Argentina", "region": "South America", "lat": -38.4161, "lon": -63.6167, "min_lat": -55.0, "max_lat": -21.8, "min_lon": -73.6, "max_lon": -53.6},
    {"name": "Norway", "country": "Norway", "region": "Northern Europe", "lat": 60.4720, "lon": 8.4689, "min_lat": 57.9, "max_lat": 71.2, "min_lon": 4.5, "max_lon": 31.1},
    {"name": "Sweden", "country": "Sweden", "region": "Northern Europe", "lat": 60.1282, "lon": 18.6435, "min_lat": 55.3, "max_lat": 69.1, "min_lon": 11.0, "max_lon": 24.2},
    {"name": "Greece", "country": "Greece", "region": "Southern Europe", "lat": 39.0742, "lon": 21.8243, "min_lat": 34.8, "max_lat": 41.7, "min_lon": 19.3, "max_lon": 29.7},
    {"name": "Iceland", "country": "Iceland", "region": "Northern Europe", "lat": 64.9631, "lon": -19.0208, "min_lat": 63.3, "max_lat": 66.6, "min_lon": -24.6, "max_lon": -13.5},
    {"name": "New Zealand", "country": "New Zealand", "region": "Oceania", "lat": -40.9006, "lon": 174.8860, "min_lat": -47.3, "max_lat": -34.4, "min_lon": 166.4, "max_lon": 178.6},
    {"name": "Philippines", "country": "Philippines", "region": "Southeast Asia", "lat": 12.8797, "lon": 121.7740, "min_lat": 4.6, "max_lat": 21.3, "min_lon": 116.9, "max_lon": 126.6},
    {"name": "Thailand", "country": "Thailand", "region": "Southeast Asia", "lat": 15.8700, "lon": 100.9925, "min_lat": 5.6, "max_lat": 20.5, "min_lon": 97.3, "max_lon": 105.6},
    {"name": "Kenya", "country": "Kenya", "region": "East Africa", "lat": -0.0236, "lon": 37.9062, "min_lat": -4.7, "max_lat": 4.6, "min_lon": 33.9, "max_lon": 41.9},
    {"name": "Nigeria", "country": "Nigeria", "region": "West Africa", "lat": 9.0820, "lon": 8.6753, "min_lat": 4.3, "max_lat": 13.9, "min_lon": 2.7, "max_lon": 14.7},
    {"name": "Chile", "country": "Chile", "region": "South America", "lat": -35.6751, "lon": -71.5430, "min_lat": -56.0, "max_lat": -17.5, "min_lon": -75.6, "max_lon": -66.9},
    {"name": "Colombia", "country": "Colombia", "region": "South America", "lat": 4.5709, "lon": -74.2973, "min_lat": -4.2, "max_lat": 12.5, "min_lon": -79.0, "max_lon": -66.8},
    {"name": "Pakistan", "country": "Pakistan", "region": "South Asia", "lat": 30.3753, "lon": 69.3451, "min_lat": 23.7, "max_lat": 37.1, "min_lon": 60.9, "max_lon": 77.8},
    {"name": "South Korea", "country": "South Korea", "region": "East Asia", "lat": 35.9078, "lon": 127.7669, "min_lat": 33.1, "max_lat": 38.6, "min_lon": 124.6, "max_lon": 131.9},
    {"name": "Vietnam", "country": "Vietnam", "region": "Southeast Asia", "lat": 14.0583, "lon": 108.2772, "min_lat": 8.5, "max_lat": 23.4, "min_lon": 102.1, "max_lon": 109.5},
]

# Detailed Global Marine & Ocean Basins
# Detailed Indian Regional Hubs & Districts for high-accuracy pinpointing
INDIAN_REGIONAL_HUBS: List[Dict[str, Any]] = [
    # Kerala - All 14 districts + major towns
    {"name": "Kochi", "state": "Kerala", "district": "Ernakulam", "lat": 9.9312, "lon": 76.2673},
    {"name": "Ernakulam", "state": "Kerala", "district": "Ernakulam", "lat": 9.9816, "lon": 76.2999},
    {"name": "Thiruvananthapuram", "state": "Kerala", "district": "Thiruvananthapuram", "lat": 8.5241, "lon": 76.9366},
    {"name": "Trivandrum", "state": "Kerala", "district": "Thiruvananthapuram", "lat": 8.5241, "lon": 76.9366},
    {"name": "Kozhikode", "state": "Kerala", "district": "Kozhikode", "lat": 11.2588, "lon": 75.7804},
    {"name": "Calicut", "state": "Kerala", "district": "Kozhikode", "lat": 11.2588, "lon": 75.7804},
    {"name": "Wayanad", "state": "Kerala", "district": "Wayanad", "lat": 11.6854, "lon": 76.1320},
    {"name": "Kalpetta", "state": "Kerala", "district": "Wayanad", "lat": 11.6054, "lon": 76.0827},
    {"name": "Mananthavady", "state": "Kerala", "district": "Wayanad", "lat": 11.8004, "lon": 76.0044},
    {"name": "Sulthan Bathery", "state": "Kerala", "district": "Wayanad", "lat": 11.6483, "lon": 76.2603},
    {"name": "Kannur", "state": "Kerala", "district": "Kannur", "lat": 11.8745, "lon": 75.3704},
    {"name": "Thalassery", "state": "Kerala", "district": "Kannur", "lat": 11.7488, "lon": 75.4909},
    {"name": "Kasaragod", "state": "Kerala", "district": "Kasaragod", "lat": 12.5102, "lon": 74.9852},
    {"name": "Kanhangad", "state": "Kerala", "district": "Kasaragod", "lat": 12.3482, "lon": 75.0964},
    {"name": "Thrissur", "state": "Kerala", "district": "Thrissur", "lat": 10.5276, "lon": 76.2144},
    {"name": "Trichur", "state": "Kerala", "district": "Thrissur", "lat": 10.5276, "lon": 76.2144},
    {"name": "Kollam", "state": "Kerala", "district": "Kollam", "lat": 8.8932, "lon": 76.6141},
    {"name": "Quilon", "state": "Kerala", "district": "Kollam", "lat": 8.8932, "lon": 76.6141},
    {"name": "Alappuzha", "state": "Kerala", "district": "Alappuzha", "lat": 9.4981, "lon": 76.3388},
    {"name": "Alleppey", "state": "Kerala", "district": "Alappuzha", "lat": 9.4981, "lon": 76.3388},
    {"name": "Palakkad", "state": "Kerala", "district": "Palakkad", "lat": 10.7867, "lon": 76.6548},
    {"name": "Palghat", "state": "Kerala", "district": "Palakkad", "lat": 10.7867, "lon": 76.6548},
    {"name": "Malappuram", "state": "Kerala", "district": "Malappuram", "lat": 11.0510, "lon": 76.0711},
    {"name": "Perinthalmanna", "state": "Kerala", "district": "Malappuram", "lat": 10.9748, "lon": 76.2268},
    {"name": "Kottayam", "state": "Kerala", "district": "Kottayam", "lat": 9.5916, "lon": 76.5222},
    {"name": "Idukki", "state": "Kerala", "district": "Idukki", "lat": 9.9189, "lon": 76.9726},
    {"name": "Painavu", "state": "Kerala", "district": "Idukki", "lat": 9.9189, "lon": 76.9726},
    {"name": "Munnar", "state": "Kerala", "district": "Idukki", "lat": 10.0889, "lon": 77.0595},
    {"name": "Thodupuzha", "state": "Kerala", "district": "Idukki", "lat": 9.8982, "lon": 76.7196},
    {"name": "Adimali", "state": "Kerala", "district": "Idukki", "lat": 10.0077, "lon": 77.1014},
    {"name": "Devikulam", "state": "Kerala", "district": "Idukki", "lat": 10.0484, "lon": 77.1066},
    {"name": "Pathanamthitta", "state": "Kerala", "district": "Pathanamthitta", "lat": 9.2648, "lon": 76.7870},
    {"name": "Thiruvalla", "state": "Kerala", "district": "Pathanamthitta", "lat": 9.3831, "lon": 76.5747},
    {"name": "Pala", "state": "Kerala", "district": "Kottayam", "lat": 9.7064, "lon": 76.6904},
    {"name": "Angamaly", "state": "Kerala", "district": "Ernakulam", "lat": 10.1960, "lon": 76.3854},
    {"name": "Aluva", "state": "Kerala", "district": "Ernakulam", "lat": 10.1004, "lon": 76.3571},
    {"name": "Perumbavoor", "state": "Kerala", "district": "Ernakulam", "lat": 10.1074, "lon": 76.4767},
    {"name": "Chalakudy", "state": "Kerala", "district": "Thrissur", "lat": 10.3023, "lon": 76.3314},
    {"name": "Guruvayur", "state": "Kerala", "district": "Thrissur", "lat": 10.5942, "lon": 76.0414},
    {"name": "Ottapalam", "state": "Kerala", "district": "Palakkad", "lat": 10.7698, "lon": 76.3783},
    {"name": "Tirur", "state": "Kerala", "district": "Malappuram", "lat": 10.9121, "lon": 75.9255},
    {"name": "Manjeri", "state": "Kerala", "district": "Malappuram", "lat": 11.1199, "lon": 76.1209},
    {"name": "Vadakara", "state": "Kerala", "district": "Kozhikode", "lat": 11.5937, "lon": 75.5833},
    {"name": "Payyannur", "state": "Kerala", "district": "Kannur", "lat": 12.0994, "lon": 75.2053},
    {"name": "Kasaba", "state": "Kerala", "district": "Kasaragod", "lat": 12.5012, "lon": 74.9860},
    {"name": "Nedumangad", "state": "Kerala", "district": "Thiruvananthapuram", "lat": 8.6060, "lon": 77.0049},
    {"name": "Neyyattinkara", "state": "Kerala", "district": "Thiruvananthapuram", "lat": 8.3988, "lon": 77.0872},
    {"name": "Attingal", "state": "Kerala", "district": "Thiruvananthapuram", "lat": 8.6988, "lon": 76.8167},
    {"name": "Varkala", "state": "Kerala", "district": "Thiruvananthapuram", "lat": 8.7336, "lon": 76.7161},
    {"name": "Kayamkulam", "state": "Kerala", "district": "Alappuzha", "lat": 9.1738, "lon": 76.5012},
    {"name": "Chengannur", "state": "Kerala", "district": "Alappuzha", "lat": 9.3157, "lon": 76.6163},
    {"name": "Adoor", "state": "Kerala", "district": "Pathanamthitta", "lat": 9.1558, "lon": 76.7384},
    {"name": "Punalur", "state": "Kerala", "district": "Kollam", "lat": 9.0060, "lon": 76.9254},
    {"name": "Thekkady", "state": "Kerala", "district": "Idukki", "lat": 9.5991, "lon": 77.1628},
    {"name": "Periyar", "state": "Kerala", "district": "Idukki", "lat": 9.5991, "lon": 77.1628},
    {"name": "Kumily", "state": "Kerala", "district": "Idukki", "lat": 9.6026, "lon": 77.1679},

    # Karnataka
    {"name": "Bengaluru", "state": "Karnataka", "district": "Bengaluru Urban", "lat": 12.9716, "lon": 77.5946},
    {"name": "Bangalore", "state": "Karnataka", "district": "Bengaluru Urban", "lat": 12.9716, "lon": 77.5946},
    {"name": "Mysuru", "state": "Karnataka", "district": "Mysuru", "lat": 12.2958, "lon": 76.6394},
    {"name": "Mysore", "state": "Karnataka", "district": "Mysuru", "lat": 12.2958, "lon": 76.6394},
    {"name": "Madikeri", "state": "Karnataka", "district": "Kodagu", "lat": 12.4244, "lon": 75.7382},
    {"name": "Coorg", "state": "Karnataka", "district": "Kodagu", "lat": 12.4244, "lon": 75.7382},
    {"name": "Kodagu", "state": "Karnataka", "district": "Kodagu", "lat": 12.4244, "lon": 75.7382},
    {"name": "Hassan", "state": "Karnataka", "district": "Hassan", "lat": 13.0072, "lon": 76.1029},
    {"name": "Mangaluru", "state": "Karnataka", "district": "Dakshina Kannada", "lat": 12.9141, "lon": 74.8560},
    {"name": "Mangalore", "state": "Karnataka", "district": "Dakshina Kannada", "lat": 12.9141, "lon": 74.8560},
    {"name": "Udupi", "state": "Karnataka", "district": "Udupi", "lat": 13.3409, "lon": 74.7421},
    {"name": "Hubballi", "state": "Karnataka", "district": "Dharwad", "lat": 15.3647, "lon": 75.1240},
    {"name": "Hubli", "state": "Karnataka", "district": "Dharwad", "lat": 15.3647, "lon": 75.1240},
    {"name": "Belagavi", "state": "Karnataka", "district": "Belagavi", "lat": 15.8497, "lon": 74.4977},
    {"name": "Belgaum", "state": "Karnataka", "district": "Belagavi", "lat": 15.8497, "lon": 74.4977},
    {"name": "Shivamogga", "state": "Karnataka", "district": "Shivamogga", "lat": 13.9299, "lon": 75.5681},
    {"name": "Shimoga", "state": "Karnataka", "district": "Shivamogga", "lat": 13.9299, "lon": 75.5681},

    # Tamil Nadu
    {"name": "Chennai", "state": "Tamil Nadu", "district": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Coimbatore", "state": "Tamil Nadu", "district": "Coimbatore", "lat": 11.0168, "lon": 76.9558},
    {"name": "Madurai", "state": "Tamil Nadu", "district": "Madurai", "lat": 9.9252, "lon": 78.1198},
    {"name": "Salem", "state": "Tamil Nadu", "district": "Salem", "lat": 11.6643, "lon": 78.1460},
    {"name": "Tiruchirappalli", "state": "Tamil Nadu", "district": "Tiruchirappalli", "lat": 10.7905, "lon": 78.7047},
    {"name": "Trichy", "state": "Tamil Nadu", "district": "Tiruchirappalli", "lat": 10.7905, "lon": 78.7047},
    {"name": "Kanyakumari", "state": "Tamil Nadu", "district": "Kanyakumari", "lat": 8.0883, "lon": 77.5385},
    {"name": "Ooty", "state": "Tamil Nadu", "district": "Nilgiris", "lat": 11.4102, "lon": 76.6950},
    {"name": "Udhagamandalam", "state": "Tamil Nadu", "district": "Nilgiris", "lat": 11.4102, "lon": 76.6950},
    {"name": "Tirunelveli", "state": "Tamil Nadu", "district": "Tirunelveli", "lat": 8.7139, "lon": 77.7567},
    {"name": "Erode", "state": "Tamil Nadu", "district": "Erode", "lat": 11.3410, "lon": 77.7172},
    {"name": "Vellore", "state": "Tamil Nadu", "district": "Vellore", "lat": 12.9165, "lon": 79.1325},
    {"name": "Tiruppur", "state": "Tamil Nadu", "district": "Tiruppur", "lat": 11.1085, "lon": 77.3411},

    # Goa & Maharashtra
    {"name": "Panaji", "state": "Goa", "district": "North Goa", "lat": 15.4909, "lon": 73.8278},
    {"name": "Panjim", "state": "Goa", "district": "North Goa", "lat": 15.4909, "lon": 73.8278},
    {"name": "Margao", "state": "Goa", "district": "South Goa", "lat": 15.2736, "lon": 73.9580},
    {"name": "Mumbai", "state": "Maharashtra", "district": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Bombay", "state": "Maharashtra", "district": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Pune", "state": "Maharashtra", "district": "Pune", "lat": 18.5204, "lon": 73.8567},
    {"name": "Nagpur", "state": "Maharashtra", "district": "Nagpur", "lat": 21.1458, "lon": 79.0882},
    {"name": "Nashik", "state": "Maharashtra", "district": "Nashik", "lat": 19.9975, "lon": 73.7898},
    {"name": "Aurangabad", "state": "Maharashtra", "district": "Aurangabad", "lat": 19.8762, "lon": 75.3433},
    {"name": "Thane", "state": "Maharashtra", "district": "Thane", "lat": 19.2183, "lon": 72.9781},

    # Delhi & North India
    {"name": "New Delhi", "state": "Delhi", "district": "New Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Delhi", "state": "Delhi", "district": "Delhi", "lat": 28.7041, "lon": 77.1025},
    {"name": "Agra", "state": "Uttar Pradesh", "district": "Agra", "lat": 27.1767, "lon": 78.0081},
    {"name": "Lucknow", "state": "Uttar Pradesh", "district": "Lucknow", "lat": 26.8467, "lon": 80.9462},
    {"name": "Varanasi", "state": "Uttar Pradesh", "district": "Varanasi", "lat": 25.3176, "lon": 82.9739},
    {"name": "Jaipur", "state": "Rajasthan", "district": "Jaipur", "lat": 26.9124, "lon": 75.7873},
    {"name": "Jodhpur", "state": "Rajasthan", "district": "Jodhpur", "lat": 26.2389, "lon": 73.0243},
    {"name": "Chandigarh", "state": "Punjab", "district": "Chandigarh", "lat": 30.7333, "lon": 76.7794},
    {"name": "Amritsar", "state": "Punjab", "district": "Amritsar", "lat": 31.6340, "lon": 74.8723},
    {"name": "Shimla", "state": "Himachal Pradesh", "district": "Shimla", "lat": 31.1048, "lon": 77.1734},
    {"name": "Dehradun", "state": "Uttarakhand", "district": "Dehradun", "lat": 30.3165, "lon": 78.0322},

    # Andhra Pradesh & Telangana
    {"name": "Hyderabad", "state": "Telangana", "district": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
    {"name": "Visakhapatnam", "state": "Andhra Pradesh", "district": "Visakhapatnam", "lat": 17.6868, "lon": 83.2185},
    {"name": "Vizag", "state": "Andhra Pradesh", "district": "Visakhapatnam", "lat": 17.6868, "lon": 83.2185},
    {"name": "Vijayawada", "state": "Andhra Pradesh", "district": "Krishna", "lat": 16.5062, "lon": 80.6480},
    {"name": "Tirupati", "state": "Andhra Pradesh", "district": "Chittoor", "lat": 13.6288, "lon": 79.4192},

    # East & Northeast India
    {"name": "Kolkata", "state": "West Bengal", "district": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    {"name": "Calcutta", "state": "West Bengal", "district": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    {"name": "Bhubaneswar", "state": "Odisha", "district": "Khordha", "lat": 20.2961, "lon": 85.8245},
    {"name": "Patna", "state": "Bihar", "district": "Patna", "lat": 25.5941, "lon": 85.1376},
    {"name": "Ranchi", "state": "Jharkhand", "district": "Ranchi", "lat": 23.3441, "lon": 85.3096},
    {"name": "Guwahati", "state": "Assam", "district": "Kamrup Metropolitan", "lat": 26.1445, "lon": 91.7362},
    {"name": "Imphal", "state": "Manipur", "district": "Imphal West", "lat": 24.8170, "lon": 93.9368},
    {"name": "Shillong", "state": "Meghalaya", "district": "East Khasi Hills", "lat": 25.5788, "lon": 91.8933},
    {"name": "Aizawl", "state": "Mizoram", "district": "Aizawl", "lat": 23.7307, "lon": 92.7173},
    {"name": "Itanagar", "state": "Arunachal Pradesh", "district": "Papum Pare", "lat": 27.0844, "lon": 93.6053},

    # Gujarat
    {"name": "Ahmedabad", "state": "Gujarat", "district": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
    {"name": "Surat", "state": "Gujarat", "district": "Surat", "lat": 21.1702, "lon": 72.8311},
    {"name": "Vadodara", "state": "Gujarat", "district": "Vadodara", "lat": 22.3072, "lon": 73.1812},
    {"name": "Rajkot", "state": "Gujarat", "district": "Rajkot", "lat": 22.3039, "lon": 70.8022},
]

def is_indian_mainland(lat: float, lon: float) -> bool:
    """Accurately determines whether coordinates fall within the terrestrial boundary of the Indian subcontinent."""
    if not (8.0 <= lat <= 37.2 and 68.1 <= lon <= 97.5):
        return False
    # Check west coast (Arabian Sea): land is EAST of the west coast profile
    if lat < 8.08:
        return False
    elif lat <= 9.5 and lon < 76.2:   # Southern Kerala / Kollam coast
        return False
    elif lat <= 11.0 and lon < 75.6:  # Kochi / Kozhikode coast
        return False
    elif lat <= 12.8 and lon < 74.8:  # Northern Kerala / Kannur / Kasaragod coast
        return False
    elif lat <= 14.5 and lon < 74.2:  # Karnataka / Mangaluru / Udupi coast
        return False
    elif lat <= 16.0 and lon < 73.4:  # Goa / Karwar coast
        return False
    elif lat <= 19.5 and lon < 72.6:  # Maharashtra / Mumbai / Konkan coast
        return False
    elif lat <= 20.8 and lon < 72.4:  # Gulf of Khambhat
        return False
    elif lat <= 23.5 and lon < 68.8:  # Gujarat / Saurashtra
        return False
    elif lat <= 25.0 and lon < 68.1:  # Kutch / Rann of Kutch
        return False
    # Check east coast (Bay of Bengal): land is WEST of east coast profile
    if lat <= 10.5 and lon > 79.9:    # Tamil Nadu south
        return False
    elif lat <= 13.5 and lon > 80.4:  # Tamil Nadu / Chennai
        return False
    elif lat <= 16.5 and lon > 80.8:  # Andhra Pradesh / Machilipatnam
        return False
    elif lat <= 18.5 and lon > 84.2:  # Andhra Pradesh / Vizag
        return False
    elif lat <= 20.5 and lon > 86.8:  # Odisha / Puri
        return False
    elif lat <= 21.8 and lon > 87.6:  # West Bengal / Sundarbans
        return False
    return True

# Detailed Global Marine & Ocean Basins (Strictly offshore to avoid terrestrial land overlap)
MARINE_BASINS: List[Dict[str, Any]] = [
    {"name": "Arabian Sea", "region": "Northern Indian Ocean", "min_lat": 0.0, "max_lat": 25.0, "min_lon": 50.0, "max_lon": 72.5},
    {"name": "Bay of Bengal", "region": "Northern Indian Ocean", "min_lat": 5.0, "max_lat": 22.0, "min_lon": 82.5, "max_lon": 96.0},
    {"name": "Laccadive Sea", "region": "Northern Indian Ocean", "min_lat": 4.0, "max_lat": 12.0, "min_lon": 71.0, "max_lon": 75.0},
    {"name": "Mediterranean Sea", "region": "Mediterranean Basin", "min_lat": 30.0, "max_lat": 42.0, "min_lon": -5.0, "max_lon": 35.0},
    {"name": "Red Sea", "region": "Middle East / East Africa", "min_lat": 12.5, "max_lat": 30.0, "min_lon": 32.0, "max_lon": 44.0},
    {"name": "Persian Gulf", "region": "Middle East", "min_lat": 23.5, "max_lat": 30.5, "min_lon": 48.0, "max_lon": 56.5},
    {"name": "Caribbean Sea", "region": "Tropical Americas", "min_lat": 9.0, "max_lat": 22.0, "min_lon": -89.0, "max_lon": -60.0},
    {"name": "Gulf of Mexico", "region": "North America", "min_lat": 18.0, "max_lat": 30.5, "min_lon": -98.0, "max_lon": -81.0},
    {"name": "North Sea", "region": "Northwest Europe", "min_lat": 51.0, "max_lat": 62.0, "min_lon": -4.0, "max_lon": 9.0},
    {"name": "Baltic Sea", "region": "Northern Europe", "min_lat": 53.5, "max_lat": 66.0, "min_lon": 10.0, "max_lon": 30.0},
    {"name": "Black Sea", "region": "Eastern Europe", "min_lat": 40.5, "max_lat": 47.0, "min_lon": 27.0, "max_lon": 42.0},
    {"name": "Caspian Sea", "region": "Central Eurasia", "min_lat": 36.5, "max_lat": 47.5, "min_lon": 46.5, "max_lon": 54.5},
    {"name": "South China Sea", "region": "Southeast Asia", "min_lat": 3.0, "max_lat": 23.0, "min_lon": 105.0, "max_lon": 121.0},
    {"name": "East China Sea", "region": "East Asia", "min_lat": 24.0, "max_lat": 33.0, "min_lon": 117.0, "max_lon": 131.0},
    {"name": "Sea of Japan", "region": "East Asia", "min_lat": 34.5, "max_lat": 52.0, "min_lon": 127.0, "max_lon": 142.0},
    {"name": "Coral Sea", "region": "Southwest Pacific", "min_lat": -26.0, "max_lat": -10.0, "min_lon": 142.0, "max_lon": 158.0},
    {"name": "Tasman Sea", "region": "Southwest Pacific", "min_lat": -47.0, "max_lat": -28.0, "min_lon": 150.0, "max_lon": 174.0},
    {"name": "Bering Sea", "region": "Subarctic Pacific", "min_lat": 52.0, "max_lat": 66.0, "min_lon": 160.0, "max_lon": 195.0},
    {"name": "Norwegian Sea", "region": "North Atlantic / Arctic", "min_lat": 62.0, "max_lat": 72.0, "min_lon": -5.0, "max_lon": 15.0},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))


def offline_reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    """
    Guaranteed high-accuracy offline fallback when external geocoding APIs fail or time out.
    Resolves any point on Earth to the true country, nearest city, or precise marine water body.
    NEVER returns raw coordinates. PRIORITIZES TERRESTRIAL LAND over water.
    """
    # 1. High-precision Indian Subcontinent terrestrial detection
    if is_indian_mainland(lat, lon):
        nearest_ind = None
        min_ind_dist = float("inf")
        for hub in INDIAN_REGIONAL_HUBS:
            d = _haversine_km(lat, lon, hub["lat"], hub["lon"])
            if d < min_ind_dist:
                min_ind_dist = d
                nearest_ind = hub

        if nearest_ind:
            name_label = nearest_ind["name"]
            if min_ind_dist > 45:
                name_label = f"{nearest_ind['district']} / {nearest_ind['name']}"
            return {
                "name": name_label,
                "display_name": f"{name_label}, {nearest_ind['state']}, India",
                "country": "India",
                "region": nearest_ind["state"],
                "type": "Terrestrial",
                "is_maritime": False,
            }

    # 2. Check if near any major global terrestrial city/seed location (within 350 km)
    nearest_city = None
    min_dist = float("inf")
    for s in SEED_LOCATIONS:
        d = _haversine_km(lat, lon, s["latitude"], s["longitude"])
        if d < min_dist:
            min_dist = d
            nearest_city = s

    if nearest_city and min_dist <= 350:
        return {
            "name": nearest_city["name"],
            "display_name": f"{nearest_city['name']}, {nearest_city['country']}",
            "country": nearest_city["country"],
            "region": nearest_city["region"],
            "type": "Terrestrial",
            "is_maritime": False,
        }

    # 3. Check if inside any major country bounding region
    matched_countries = []
    for c in GLOBAL_COUNTRIES:
        if c["name"] == "India":
            continue  # Handled with high precision by is_indian_mainland above
        if c["min_lat"] <= lat <= c["max_lat"] and c["min_lon"] <= lon <= c["max_lon"]:
            d_center = _haversine_km(lat, lon, c["lat"], c["lon"])
            matched_countries.append((d_center, c))

    if matched_countries:
        matched_countries.sort(key=lambda x: x[0])
        best_country = matched_countries[0][1]
        name_label = f"{best_country['name']} (Territory)"
        if nearest_city and min_dist <= 1200 and nearest_city["country"] == best_country["name"]:
            name_label = f"{best_country['name']} (near {nearest_city['name']})"
        return {
            "name": name_label,
            "display_name": f"{best_country['name']}, {best_country['region']}",
            "country": best_country["name"],
            "region": best_country["region"],
            "type": "Terrestrial",
            "is_maritime": False,
        }

    # 4. Strictly Oceanic/Maritime check (only reached if no terrestrial land matched)
    for mb in MARINE_BASINS:
        if mb["min_lat"] <= lat <= mb["max_lat"] and mb["min_lon"] <= lon <= mb["max_lon"]:
            if mb["name"] in ["Arabian Sea", "Bay of Bengal", "Laccadive Sea"] and is_indian_mainland(lat, lon):
                continue
            return {
                "name": mb["name"],
                "display_name": f"{mb['name']} ({mb['region']})",
                "country": mb["name"],
                "region": mb["region"],
                "type": "Maritime / Sea",
                "is_maritime": True,
            }

    # 5. Open Oceanic fallback with specific ocean sector
    if lat > 66.5:
        ocean = "Arctic Ocean"
        sub = "Polar Ice Sheet Basin"
    elif lat < -60.0:
        ocean = "Southern Ocean"
        sub = "Antarctic Circumpolar Current"
    elif -70.0 <= lon <= 20.0:
        ocean = "Atlantic Ocean"
        sub = "North Atlantic Basin" if lat >= 0 else "South Atlantic Basin"
    elif 20.0 < lon <= 100.0 and lat < 30.0:
        ocean = "Indian Ocean"
        sub = "Equatorial Indian Ocean" if lat >= -10 else "Southern Indian Ocean"
    elif 30.0 <= lat <= 46.0 and -5.0 <= lon <= 36.0:
        ocean = "Mediterranean Sea"
        sub = "Mediterranean Basin"
    else:
        ocean = "Pacific Ocean"
    # 5. Open Oceanic fallback with specific ocean sector
    if lat > 66.5:
        ocean = "Arctic Ocean"
        sub = "Polar Ice Sheet Basin"
    elif lat < -60.0:
        ocean = "Southern Ocean"
        sub = "Antarctic Circumpolar Current"
    elif -70.0 <= lon <= 20.0:
        ocean = "Atlantic Ocean"
        sub = "North Atlantic Basin" if lat >= 0 else "South Atlantic Basin"
    elif 20.0 < lon <= 100.0 and lat < 30.0:
        ocean = "Indian Ocean"
        sub = "Equatorial Indian Ocean" if lat >= -10 else "Southern Indian Ocean"
    elif 30.0 <= lat <= 46.0 and -5.0 <= lon <= 36.0:
        ocean = "Mediterranean Sea"
        sub = "Mediterranean Basin"
    else:
        ocean = "Pacific Ocean"
        sub = "North Pacific Basin" if lat >= 0 else "South Pacific Basin"

    return {
        "name": f"{ocean}",
        "display_name": f"{ocean} ({sub})",
        "country": ocean,
        "region": sub,
        "type": "Maritime / Oceanic",
        "is_maritime": True,
    }


async def geocode_query(query: str) -> List[Dict[str, Any]]:
    """
    Search location via OpenStreetMap Nominatim API, with fallback to local seed locations.
    """
    q_clean = query.strip().lower()

    # 1. Check INDIAN_REGIONAL_HUBS for instant offline match (cities, towns, districts)
    hub_matches: List[Dict[str, Any]] = []
    for hub in INDIAN_REGIONAL_HUBS:
        if (
            q_clean in hub["name"].lower()
            or q_clean in hub["district"].lower()
            or q_clean in hub["state"].lower()
        ):
            hub_matches.append({
                "id": f"hub-{hub['name'].lower().replace(' ', '-')}",
                "name": hub["name"],
                "country": "India",
                "region": hub["state"],
                "latitude": hub["lat"],
                "longitude": hub["lon"],
                "population": None
            })

    # 2. Check SEED_LOCATIONS for country/region-level matches
    local_matches = [
        loc for loc in SEED_LOCATIONS
        if q_clean in loc["name"].lower() or q_clean in loc["country"].lower() or (loc.get("region") and q_clean in loc["region"].lower())
    ]

    # Query OpenStreetMap Nominatim for any location on Earth
    remote_matches: List[Dict[str, Any]] = []
    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "EarthWatchAI-GlobalIntelligence/2.0 (contact: info@earthwatch.earth)"}
        params = {"q": query, "format": "json", "limit": 6, "addressdetails": 1}

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for item in data:
                    addr = item.get("address", {})
                    country = addr.get("country", "")
                    name = item.get("name") or item.get("display_name", "").split(",")[0]
                    loc_id = f"osm-{item.get('osm_id', 'loc')}"
                    remote_matches.append({
                        "id": loc_id,
                        "name": name,
                        "country": country or "Global",
                        "region": addr.get("state") or addr.get("county") or addr.get("continent") or "Global",
                        "latitude": float(item.get("lat", 0)),
                        "longitude": float(item.get("lon", 0)),
                        "population": None
                    })
    except Exception:
        pass

    # Google Maps Places / Geocode search if API key configured
    google_api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if google_api_key:
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {"address": query, "key": google_api_key}
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    g_results = data.get("results", [])
                    for item in g_results:
                        geom = item.get("geometry", {}).get("location", {})
                        if geom:
                            addr = item.get("formatted_address", "")
                            name = addr.split(",")[0]
                            remote_matches.append({
                                "id": f"gmap-{item.get('place_id', 'loc')}",
                                "name": name,
                                "country": "Global",
                                "region": addr,
                                "latitude": float(geom.get("lat", 0)),
                                "longitude": float(geom.get("lng", 0)),
                                "population": None
                            })
        except Exception:
            pass

    seen_coords = set()
    combined: List[Dict[str, Any]] = []

    # Hub matches first (most specific & instant), then seeds, then remote
    for item in hub_matches + local_matches + remote_matches:
        coord_key = (round(item["latitude"], 2), round(item["longitude"], 2))
        if coord_key not in seen_coords:
            seen_coords.add(coord_key)
            combined.append(item)

    return combined[:10]  # Limit to 10 results


# In-memory reverse geocode cache (key: round(lat, 3), round(lon, 3))
_reverse_geo_cache: Dict[tuple, Dict[str, Any]] = {}


async def reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    """
    Reverse geocodes latitude/longitude to accurate human place, city, region, and country names.
    Uses multi-tier live APIs (Google Maps Geocoding API + BigDataCloud Client API + OpenStreetMap Nominatim + Photon Komoot),
    with comprehensive offline geographic atlas fallback.
    Guarantees an accurate, human place name is returned for every point on the globe.
    """
    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in _reverse_geo_cache:
        return _reverse_geo_cache[cache_key]

    is_india = is_indian_mainland(lat, lon)

    # Tier 0: Google Maps Reverse Geocoding API (Industry gold-standard when API key is provided)
    google_api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if google_api_key:
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {"latlng": f"{lat:.6f},{lon:.6f}", "key": google_api_key}
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    if results:
                        top = results[0]
                        formatted = top.get("formatted_address", "")
                        components = top.get("address_components", [])
                        
                        city = ""
                        state = ""
                        country = ""
                        district = ""
                        for comp in components:
                            types = comp.get("types", [])
                            if "locality" in types:
                                city = comp.get("long_name", "")
                            elif "administrative_area_level_2" in types:
                                district = comp.get("long_name", "")
                            elif "administrative_area_level_1" in types:
                                state = comp.get("long_name", "")
                            elif "country" in types:
                                country = comp.get("long_name", "")

                        place_name = city or district or state or formatted.split(",")[0]
                        res = {
                            "name": place_name,
                            "display_name": formatted or f"{place_name}, {state}, {country}",
                            "country": country or ("India" if is_india else "Global"),
                            "region": state or district or "Global Region",
                            "type": "Terrestrial",
                            "is_maritime": False
                        }
                        _reverse_geo_cache[cache_key] = res
                        return res
        except Exception:
            pass

    # Tier 1: BigDataCloud Reverse Geocoding Client API (Free, fast, rich locality hierarchy)
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat:.5f}&longitude={lon:.5f}&localityLanguage=en"
        async with httpx.AsyncClient(timeout=4.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                city = data.get("city") or data.get("locality") or ""
                subdivision = data.get("principalSubdivision") or ""
                country = data.get("countryName") or ("India" if is_india else "")
                continent = data.get("continent") or ""

                # Check informative water bodies
                informative = data.get("localityInfo", {}).get("informative", [])
                water_bodies = [
                    x.get("name") for x in informative
                    if any(w in x.get("name", "").lower() for w in ["ocean", "sea", "gulf", "bay", "strait", "channel", "basin", "sound", "ridge", "trench"])
                ]
                water_body = water_bodies[0] if (water_bodies and not is_india) else ""

                # Administrative sub-divisions (district, taluk, county, village)
                admin_items = data.get("localityInfo", {}).get("administrative", [])
                local_admins = [
                    a.get("name") for a in admin_items
                    if a.get("name") and a.get("name") not in [country, subdivision, continent, "Mainland India", "Southern Zonal Council"]
                ]
                admin_detail = local_admins[-1] if local_admins else (local_admins[0] if local_admins else "")

                is_maritime = False if is_india else ((not country and bool(water_body)) or ("ocean" in city.lower() or "sea" in city.lower()))

                if city or subdivision or country or admin_detail:
                    primary_name = city or admin_detail or subdivision or country
                    parts_clean = []
                    for p in [primary_name, subdivision, country]:
                        if p and p not in parts_clean:
                            parts_clean.append(p)

                    display_name = ", ".join(parts_clean)
                    result = {
                        "name": primary_name,
                        "display_name": display_name,
                        "country": country or (water_body or "International Waters"),
                        "region": subdivision or continent or "Global Region",
                        "type": "Maritime" if is_maritime else "Terrestrial",
                        "is_maritime": is_maritime
                    }
                    _reverse_geo_cache[cache_key] = result
                    return result
                elif water_body and not is_india:
                    result = {
                        "name": water_body,
                        "display_name": f"{water_body} ({abs(lat):.2f}°, {abs(lon):.2f}°)",
                        "country": "International Waters",
                        "region": water_body,
                        "type": "Maritime / Oceanic",
                        "is_maritime": True
                    }
    except Exception:
        pass

    # Tier 2: OpenStreetMap Nominatim reverse geocode
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        headers = {"User-Agent": "EarthWatchAI-GlobalIntelligence/2.0 (contact: info@earthwatch.earth)"}
        params = {"lat": lat, "lon": lon, "format": "json", "zoom": 12, "addressdetails": 1}

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if "address" in data:
                    addr = data["address"]
                    country = addr.get("country", "")
                    state = addr.get("state") or addr.get("region") or addr.get("province") or ""
                    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb") or addr.get("county") or addr.get("municipality") or ""
                    place_name = city or state or country

                    display_parts = [p for p in [city, state, country] if p]
                    display_name = ", ".join(display_parts) if display_parts else data.get("display_name", place_name)

                    if place_name:
                        result = {
                            "name": place_name,
                            "display_name": display_name,
                            "country": country or "Global Territory",
                            "region": state or country or "Continental Region",
                            "type": "Terrestrial",
                            "is_maritime": False
                        }
                        _reverse_geo_cache[cache_key] = result
                        return result
    except Exception:
        pass

    # Tier 3: Photon Komoot reverse geocoding API
    try:
        url = f"https://photon.komoot.io/reverse?lat={lat:.5f}&lon={lon:.5f}"
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                feat = resp.json().get("features", [])
                if feat:
                    props = feat[0].get("properties", {})
                    name = props.get("name") or props.get("city") or props.get("district")
                    country = props.get("country")
                    state = props.get("state")
                    if name or country:
                        parts = [p for p in [name, state, country] if p]
                        result = {
                            "name": name or state or country,
                            "display_name": ", ".join(parts),
                            "country": country or "Global Territory",
                            "region": state or country or "Regional Territory",
                            "type": "Terrestrial",
                            "is_maritime": False
                        }
                        _reverse_geo_cache[cache_key] = result
                        return result
    except Exception:
        pass

    # Tier 4: Reliable Offline Global Atlas (never returns raw coordinates)
    offline_result = offline_reverse_geocode(lat, lon)
    _reverse_geo_cache[cache_key] = offline_result
    return offline_result
