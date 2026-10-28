/**
 * ============================================================
 * CUACAKINI - CORE JAVASCRIPT APPLICATION (HARDENED & SECURED)
 * Pantau Cuaca Seluruh Daerah di Dunia & 38 Provinsi Indonesia
 * Dilengkapi Proteksi Siber Berlapis (Anti-XSS, Anti-Tamper, Rate-Limiter)
 * ============================================================
 */

(() => {
  'use strict';

  // ------------------------------------------------------------
  // 1. CONSTANTS & WMO WEATHER DICTIONARY (IMMUTABLE / FROZEN)
  // ------------------------------------------------------------
  const STORAGE_KEYS = Object.freeze({
    THEME: 'cuacakini_theme',
    UNIT: 'cuacakini_unit',
    FAVORITES: 'cuacakini_favorites',
    RECENT: 'cuacakini_recent',
    LAST_LOCATION: 'cuacakini_last_loc'
  });

  const DEFAULT_CITY = Object.freeze({
    name: 'Jakarta Pusat',
    country: 'Indonesia',
    latitude: -6.1805,
    longitude: 106.8284
  });

  /**
   * WMO Weather Interpretation Codes (WMO 4501)
   * Terjemahan Bahasa Indonesia & FontAwesome Icons
   */
  const WMO_WEATHER = Object.freeze({
    0: { desc: 'Cerah', iconDay: 'fa-sun text-gold', iconNight: 'fa-moon text-primary' },
    1: { desc: 'Sebagian Besar Cerah', iconDay: 'fa-cloud-sun text-gold', iconNight: 'fa-cloud-moon text-primary' },
    2: { desc: 'Cerah Berawan', iconDay: 'fa-cloud-sun', iconNight: 'fa-cloud-moon' },
    3: { desc: 'Mendung Berawan', iconDay: 'fa-cloud', iconNight: 'fa-cloud' },
    45: { desc: 'Berkabut', iconDay: 'fa-smog', iconNight: 'fa-smog' },
    48: { desc: 'Kabut Tebal', iconDay: 'fa-smog', iconNight: 'fa-smog' },
    51: { desc: 'Gerimis Ringan', iconDay: 'fa-cloud-rain text-cyan', iconNight: 'fa-cloud-rain text-cyan' },
    53: { desc: 'Gerimis Sedang', iconDay: 'fa-cloud-rain text-cyan', iconNight: 'fa-cloud-rain text-cyan' },
    55: { desc: 'Gerimis Lebat', iconDay: 'fa-cloud-rain text-cyan', iconNight: 'fa-cloud-rain text-cyan' },
    56: { desc: 'Gerimis Dingin', iconDay: 'fa-snowflake text-cyan', iconNight: 'fa-snowflake text-cyan' },
    57: { desc: 'Gerimis Membeku', iconDay: 'fa-snowflake text-cyan', iconNight: 'fa-snowflake text-cyan' },
    61: { desc: 'Hujan Ringan', iconDay: 'fa-cloud-sun-rain', iconNight: 'fa-cloud-moon-rain' },
    63: { desc: 'Hujan Sedang', iconDay: 'fa-cloud-showers-heavy text-primary', iconNight: 'fa-cloud-showers-heavy text-primary' },
    65: { desc: 'Hujan Lebat / Deras', iconDay: 'fa-cloud-showers-heavy text-primary', iconNight: 'fa-cloud-showers-heavy text-primary' },
    66: { desc: 'Hujan Es Ringan', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake' },
    67: { desc: 'Hujan Es Lebat', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake' },
    71: { desc: 'Salju Ringan', iconDay: 'fa-snowflake text-cyan', iconNight: 'fa-snowflake text-cyan' },
    73: { desc: 'Salju Sedang', iconDay: 'fa-snowflake text-cyan', iconNight: 'fa-snowflake text-cyan' },
    75: { desc: 'Salju Lebat', iconDay: 'fa-snowflake text-cyan', iconNight: 'fa-snowflake text-cyan' },
    77: { desc: 'Hujan Butiran Salju', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake' },
    80: { desc: 'Hujan Guyur Ringan', iconDay: 'fa-cloud-showers-water', iconNight: 'fa-cloud-showers-water' },
    81: { desc: 'Hujan Guyur Sedang', iconDay: 'fa-cloud-showers-heavy', iconNight: 'fa-cloud-showers-heavy' },
    82: { desc: 'Hujan Guyur Sangat Lebat', iconDay: 'fa-cloud-showers-heavy', iconNight: 'fa-cloud-showers-heavy' },
    85: { desc: 'Hujan Salju Guyur', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake' },
    86: { desc: 'Badai Salju Lebat', iconDay: 'fa-snowflake', iconNight: 'fa-snowflake' },
    95: { desc: 'Badai Petir', iconDay: 'fa-cloud-bolt text-gold', iconNight: 'fa-cloud-bolt text-gold' },
    96: { desc: 'Badai Petir & Hujan Es Ringan', iconDay: 'fa-cloud-bolt text-gold', iconNight: 'fa-cloud-bolt text-gold' },
    99: { desc: 'Badai Petir & Hujan Es Lebat', iconDay: 'fa-cloud-bolt text-gold', iconNight: 'fa-cloud-bolt text-gold' }
  });

  // ------------------------------------------------------------
  // 2. STATE MANAGEMENT
  // ------------------------------------------------------------
  const state = {
    theme: 'light',
    unit: 'C', // 'C' atau 'F'
    currentLocation: { ...DEFAULT_CITY },
    weatherData: null,
    airQualityData: null,
    favorites: [],
    recentSearches: [],
    searchDebounceTimer: null,
    map: null,
    mapMarker: null,
    modalScope: 'indonesia', // 'indonesia' atau 'global'
    activeModalFilter: 'all',
    activeModalSub: 'all'
  };

  // ------------------------------------------------------------
  // 3. ENTERPRISE CYBERSECURITY UTILITIES & DEFENSES
  // ------------------------------------------------------------

  /**
   * RATE LIMITER: Mencegah bot / hacker membanjiri browser atau API publik (Anti-DDoS / Anti-Flooding)
   */
  const rateLimiter = {
    timestamps: [],
    maxRequests: 35,
    windowMs: 30000, // Maksimal 35 panggilan dalam jendela 30 detik
    canRequest() {
      const now = Date.now();
      this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
      if (this.timestamps.length >= this.maxRequests) {
        return false;
      }
      this.timestamps.push(now);
      return true;
    }
  };

  /**
   * STRICT XSS SANITIZER: Membersihkan teks dari entitas HTML berbahaya, backticks, script tags, dan control chars
   */
  function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    const cleanStr = String(str);
    return cleanStr
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Hapus karakter kontrol biner
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g, '&#96;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * ICON CLASS SANITIZER: Memastikan class FontAwesome hanya berisi karakter alfanumerik aman
   */
  function sanitizeIcon(iconStr) {
    if (typeof iconStr !== 'string') return 'fa-cloud';
    const clean = iconStr.trim();
    if (/^[a-zA-Z0-9\s-]+$/.test(clean)) {
      return clean;
    }
    return 'fa-cloud';
  }

  /**
   * PROTOTYPE POLLUTION & SCHEMA VALIDATOR FOR LOCATIONS
   * Mencegah eksploitasi prototype poisoning lewat manipulasi LocalStorage
   */
  function validateLocation(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

    // Periksa dan tolak jika ada property injection prototype
    if (Object.prototype.hasOwnProperty.call(obj, '__proto__') ||
        Object.prototype.hasOwnProperty.call(obj, 'constructor') ||
        Object.prototype.hasOwnProperty.call(obj, 'prototype')) {
      console.warn('Security Alert: Blocked prototype pollution attempt in location object.');
      return null;
    }

    const name = typeof obj.name === 'string' ? sanitizeHTML(obj.name.trim().slice(0, 100)) : 'Lokasi';
    const country = typeof obj.country === 'string' ? sanitizeHTML(obj.country.trim().slice(0, 100)) : 'Global';
    const lat = parseFloat(obj.latitude);
    const lon = parseFloat(obj.longitude);

    // Validasi batas koordinat geografi bumi secara ketat
    if (!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lon) || lon < -180 || lon > 180) {
      return null;
    }

    return { name, country, latitude: lat, longitude: lon };
  }

  /**
   * SAFE LOCAL STORAGE WRAPPER WITH INTEGRITY CHECK
   */
  const safeStorage = {
    get(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return defaultValue;
        const parsed = JSON.parse(raw);

        // Validasi struktur khusus untuk favorites dan recent searches
        if (key === STORAGE_KEYS.FAVORITES || key === STORAGE_KEYS.RECENT) {
          if (!Array.isArray(parsed)) return defaultValue;
          return parsed.map(validateLocation).filter(Boolean);
        }

        if (key === STORAGE_KEYS.LAST_LOCATION) {
          return validateLocation(parsed) || defaultValue;
        }

        if (key === STORAGE_KEYS.THEME) {
          return (parsed === 'dark' || parsed === 'light') ? parsed : 'light';
        }

        if (key === STORAGE_KEYS.UNIT) {
          return (parsed === 'F' || parsed === 'C') ? parsed : 'C';
        }

        return parsed;
      } catch (err) {
        console.warn('Storage read warning / integrity check:', err);
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn('Storage write warning:', err);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn('Storage remove warning:', err);
      }
    },
    clearAll() {
      try {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      } catch (err) {
        console.warn('Storage clear warning:', err);
      }
    }
  };

  function formatTemp(celsius) {
    if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
    if (state.unit === 'F') {
      const f = (celsius * 9) / 5 + 32;
      return `${Math.round(f)}°`;
    }
    return `${Math.round(celsius)}°`;
  }

  function getTempNumber(celsius) {
    if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
    if (state.unit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  function getWindDirectionText(degrees) {
    if (degrees === undefined || degrees === null || isNaN(degrees)) return 'Variabel';
    const directions = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
    const index = Math.round((degrees % 360) / 45) % 8;
    return directions[index];
  }

  function getUvIndexDescription(uv) {
    if (uv === null || uv === undefined || isNaN(uv)) return 'Tidak tersedia';
    if (uv <= 2) return `${Math.round(uv)} (Rendah)`;
    if (uv <= 5) return `${Math.round(uv)} (Sedang)`;
    if (uv <= 7) return `${Math.round(uv)} (Tinggi)`;
    if (uv <= 10) return `${Math.round(uv)} (Sangat Tinggi)`;
    return `${Math.round(uv)} (Ekstrem)`;
  }

  function getAqiDescription(aqi) {
    if (!aqi || isNaN(aqi)) return 'Baik (AQI --)';
    if (aqi <= 20) return `Sangat Baik (AQI ${Math.round(aqi)})`;
    if (aqi <= 40) return `Baik (AQI ${Math.round(aqi)})`;
    if (aqi <= 60) return `Sedang (AQI ${Math.round(aqi)})`;
    if (aqi <= 80) return `Kurang Sehat (AQI ${Math.round(aqi)})`;
    if (aqi <= 100) return `Tidak Sehat (AQI ${Math.round(aqi)})`;
    return `Berbahaya (AQI ${Math.round(aqi)})`;
  }

  function showToast(message, icon = 'fa-circle-info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${sanitizeIcon(icon)}"></i> <span>${sanitizeHTML(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ------------------------------------------------------------
  // 4. API FETCHING SERVICES (OPEN-METEO WITH RATE LIMITING)
  // ------------------------------------------------------------

  async function fetchWeatherData(lat, lon) {
    if (!rateLimiter.canRequest()) {
      throw new Error('Rate limit exceeded: Permintaan terlalu sering. Harap tunggu sebentar demi keamanan sistem.');
    }

    // Validasi tipe dan batas nilai koordinat sebelum request
    if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Invalid coordinate bounds.');
    }

    const safeLat = encodeURIComponent(lat);
    const safeLon = encodeURIComponent(lon);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async function fetchAirQualityData(lat, lon) {
    if (!isFinite(lat) || !isFinite(lon)) return null;
    const safeLat = encodeURIComponent(lat);
    const safeLon = encodeURIComponent(lon);
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${safeLat}&longitude=${safeLon}&current=european_aqi,pm10,pm2_5`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (err) {
      console.warn('Air quality unavailable:', err);
      return null;
    }
  }

  async function searchWorldCities(query) {
    if (!query || typeof query !== 'string') return [];
    const trimmed = query.trim().slice(0, 75);
    if (trimmed.length < 2) return [];

    if (!rateLimiter.canRequest()) {
      console.warn('Rate limiter active on search.');
      return [];
    }

    const cleanQuery = encodeURIComponent(trimmed);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cleanQuery}&count=10&language=id&format=json`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.results) ? data.results : [];
    } catch (err) {
      console.warn('World geocoding error:', err);
      return [];
    }
  }

  async function reverseGeocode(lat, lon) {
    if (!isFinite(lat) || !isFinite(lon)) {
      return { name: 'Lokasi Anda', country: 'Global' };
    }
    const safeLat = encodeURIComponent(lat);
    const safeLon = encodeURIComponent(lon);
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${safeLat}&longitude=${safeLon}&localityLanguage=id`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const cityName = sanitizeHTML((data.city || data.locality || data.principalSubdivision || 'Titik Koordinat').slice(0, 80));
        const countryName = sanitizeHTML((data.countryName || 'Global').slice(0, 80));
        return { name: cityName, country: countryName };
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    }
    return { name: `Lokasi (${lat.toFixed(2)}, ${lon.toFixed(2)})`, country: 'Dunia' };
  }

  // ------------------------------------------------------------
  // 5. INTERACTIVE GLOBAL WEATHER MAP (LEAFLET.JS)
  // ------------------------------------------------------------

  function initWorldMap() {
    const mapContainer = document.getElementById('worldWeatherMap');
    if (!mapContainer || typeof L === 'undefined') return;

    try {
      const initialLat = state.currentLocation.latitude;
      const initialLon = state.currentLocation.longitude;

      state.map = L.map('worldWeatherMap', {
        center: [initialLat, initialLon],
        zoom: 5,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true
      });

      // Menggunakan CartoDB Voyager Tile yang cepat, stabil, dan tidak memblokir browser laptop / desktop
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      });
      tileLayer.addTo(state.map);

      const markerIcon = L.divIcon({
        className: 'custom-map-marker',
        html: '<i class="fa-solid fa-location-dot" style="font-size: 11px;"></i>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      state.mapMarker = L.marker([initialLat, initialLon], { icon: markerIcon }).addTo(state.map);
      updateMapMarkerPopup();

      state.map.on('click', async (e) => {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;

        showToast('Memuat cuaca titik yang dipilih...', 'fa-map-pin');

        const geo = await reverseGeocode(lat, lon);
        const loc = validateLocation({
          name: geo.name,
          country: geo.country,
          latitude: lat,
          longitude: lon
        });

        if (loc) {
          loadWeatherForLocation(loc, true);
        }
      });

      setTimeout(() => {
        if (state.map) state.map.invalidateSize();
      }, 400);

    } catch (err) {
      console.warn('Map initialization failed:', err);
    }
  }

  function updateMapLocation(lat, lon) {
    if (!state.map || !state.mapMarker) return;
    try {
      state.map.flyTo([lat, lon], Math.max(state.map.getZoom(), 6), { duration: 1.2 });
      state.mapMarker.setLatLng([lat, lon]);
      updateMapMarkerPopup();
    } catch (err) {
      console.warn('Map flyTo failed:', err);
    }
  }

  function updateMapMarkerPopup() {
    if (!state.mapMarker) return;
    const tempStr = (state.weatherData && state.weatherData.current)
      ? formatTemp(state.weatherData.current.temperature_2m)
      : '--';

    const safeName = sanitizeHTML(state.currentLocation.name);
    const safeCountry = sanitizeHTML(state.currentLocation.country);

    const popupContent = `
      <div style="text-align: center; padding: 4px;">
        <div class="map-popup-title">${safeName}</div>
        <div class="map-popup-country">${safeCountry}</div>
        <div class="map-popup-temp">${tempStr}</div>
      </div>
    `;
    state.mapMarker.bindPopup(popupContent);
  }

  // ------------------------------------------------------------
  // 6. DOM RENDERING LOGIC
  // ------------------------------------------------------------

  function renderWeatherDashboard() {
    const w = state.weatherData;
    if (!w || !w.current) return;

    const current = w.current;
    const daily = w.daily;
    const hourly = w.hourly;
    const isDay = current.is_day === 1;
    const wCode = current.weather_code;
    const weatherInfo = WMO_WEATHER[wCode] || { desc: 'Cerah', iconDay: 'fa-sun text-gold', iconNight: 'fa-moon text-primary' };

    // 1. Lokasi & Tanggal (Gunakan textContent untuk isolasi XSS 100%)
    document.getElementById('cwCityName').textContent = state.currentLocation.name;
    document.getElementById('cwCountryName').textContent = state.currentLocation.country;

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: w.timezone });
      const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: w.timezone });
      document.getElementById('cwLocalTime').innerHTML = `<i class="fa-regular fa-clock"></i> Pukul ${sanitizeHTML(timeStr)}`;
      document.getElementById('cwLocalDate').textContent = dateStr;
    } catch (e) {
      document.getElementById('cwLocalTime').textContent = 'Waktu Lokal';
      document.getElementById('cwLocalDate').textContent = new Date().toLocaleDateString('id-ID');
    }

    updateFavoriteStarState();

    // 2. Ikon Cuaca Utama
    const iconClass = isDay ? weatherInfo.iconDay : weatherInfo.iconNight;
    const iconElem = document.getElementById('cwWeatherIcon');
    iconElem.innerHTML = `<i class="fa-solid ${sanitizeIcon(iconClass)} icon-weather-main"></i>`;

    // 3. Suhu Utama & Kondisi
    document.getElementById('cwTempNumber').textContent = getTempNumber(current.temperature_2m);
    document.getElementById('cwTempUnitSymbol').textContent = `°${state.unit}`;
    document.getElementById('cwConditionText').textContent = weatherInfo.desc;

    if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
      document.getElementById('cwTempMax').textContent = formatTemp(daily.temperature_2m_max[0]);
      document.getElementById('cwTempMin').textContent = formatTemp(daily.temperature_2m_min[0]);
    }
    document.getElementById('cwFeelsLike').textContent = formatTemp(current.apparent_temperature);

    // 4. Highlights
    const rainChance = (daily && daily.precipitation_probability_max && daily.precipitation_probability_max[0] !== undefined)
      ? `${daily.precipitation_probability_max[0]}%`
      : '0%';
    document.getElementById('cwRainChance').textContent = rainChance;

    const uvMax = (daily && daily.uv_index_max && daily.uv_index_max.length > 0) ? daily.uv_index_max[0] : null;
    document.getElementById('cwUvIndex').textContent = getUvIndexDescription(uvMax);

    const aqiVal = (state.airQualityData && state.airQualityData.current) ? state.airQualityData.current.european_aqi : null;
    document.getElementById('cwAqiText').textContent = getAqiDescription(aqiVal);

    // 5. Kartu Metrik Detail
    document.getElementById('metricHumidity').textContent = `${current.relative_humidity_2m}%`;
    const hum = current.relative_humidity_2m;
    document.getElementById('metricHumiditySub').textContent = hum < 40 ? 'Udara relatif kering' : (hum <= 70 ? 'Kelembapan nyaman' : 'Udara cukup lembap');

    document.getElementById('metricWindSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/j`;
    document.getElementById('metricWindDirection').textContent = `Arah: ${getWindDirectionText(current.wind_direction_10m)}`;

    document.getElementById('metricPressure').textContent = `${Math.round(current.pressure_msl)} hPa`;
    document.getElementById('metricPressureSub').textContent = current.pressure_msl > 1013 ? 'Tekanan Tinggi' : 'Kondisi Normal';

    document.getElementById('metricCloudCover').textContent = `${current.cloud_cover}%`;
    const clouds = current.cloud_cover;
    document.getElementById('metricCloudSub').textContent = clouds < 20 ? 'Langit Cerah' : (clouds < 70 ? 'Sebagian Berawan' : 'Mendung Tebal');

    if (daily && daily.sunrise && daily.sunrise.length > 0) {
      const sunriseTime = daily.sunrise[0].split('T')[1]?.slice(0, 5) || '05:30';
      document.getElementById('metricSunrise').textContent = sanitizeHTML(sunriseTime);
    }
    if (daily && daily.sunset && daily.sunset.length > 0) {
      const sunsetTime = daily.sunset[0].split('T')[1]?.slice(0, 5) || '18:00';
      document.getElementById('metricSunset').textContent = sanitizeHTML(sunsetTime);
    }

    updateMapLocation(state.currentLocation.latitude, state.currentLocation.longitude);
    renderHourlyForecast(hourly, w.timezone);
    renderDailyForecast(daily);
  }

  function renderHourlyForecast(hourly, timezone) {
    const container = document.getElementById('hourlyForecastContainer');
    container.innerHTML = '';
    if (!hourly || !hourly.time) return;

    const nowISO = new Date().toISOString().slice(0, 13);
    let startIndex = hourly.time.findIndex(t => t.startsWith(nowISO));
    if (startIndex === -1) startIndex = 0;

    const next24 = hourly.time.slice(startIndex, startIndex + 24);

    next24.forEach((timeStr, idx) => {
      const actualIndex = startIndex + idx;
      const hourOnly = timeStr.split('T')[1]?.slice(0, 5) || '';
      const temp = hourly.temperature_2m[actualIndex];
      const wCode = hourly.weather_code[actualIndex];
      const rainProb = hourly.precipitation_probability ? hourly.precipitation_probability[actualIndex] : 0;
      const isHourDay = hourly.is_day ? hourly.is_day[actualIndex] === 1 : true;
      const info = WMO_WEATHER[wCode] || { iconDay: 'fa-sun', iconNight: 'fa-moon' };
      const icon = isHourDay ? info.iconDay : info.iconNight;

      const card = document.createElement('div');
      card.className = `hourly-item-card ${idx === 0 ? 'current-hour' : ''}`;

      const spanTime = document.createElement('span');
      spanTime.className = 'hourly-time';
      spanTime.textContent = idx === 0 ? 'Sekarang' : hourOnly;

      const divIcon = document.createElement('div');
      divIcon.className = 'hourly-icon';
      divIcon.innerHTML = `<i class="fa-solid ${sanitizeIcon(icon)}"></i>`;

      const spanTemp = document.createElement('span');
      spanTemp.className = 'hourly-temp';
      spanTemp.textContent = formatTemp(temp);

      const spanRain = document.createElement('span');
      spanRain.className = 'hourly-rain';
      spanRain.title = 'Peluang Hujan';
      spanRain.innerHTML = `<i class="fa-solid fa-droplet"></i> ${Number(rainProb)}%`;

      card.appendChild(spanTime);
      card.appendChild(divIcon);
      card.appendChild(spanTemp);
      card.appendChild(spanRain);
      container.appendChild(card);
    });
  }

  function renderDailyForecast(daily) {
    const container = document.getElementById('dailyForecastContainer');
    container.innerHTML = '';
    if (!daily || !daily.time) return;

    const allMins = daily.temperature_2m_min || [];
    const allMaxs = daily.temperature_2m_max || [];
    const minGlobal = Math.min(...allMins);
    const maxGlobal = Math.max(...allMaxs);
    const rangeGlobal = (maxGlobal - minGlobal) || 1;

    const daysCount = Math.min(daily.time.length, 7);

    for (let i = 0; i < daysCount; i++) {
      const dateStr = daily.time[i];
      const dateObj = new Date(dateStr + 'T00:00:00');
      
      let dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      if (i === 0) dayName = 'Hari Ini';
      else if (i === 1) dayName = 'Besok';

      const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const wCode = daily.weather_code[i];
      const info = WMO_WEATHER[wCode] || { desc: 'Cerah', iconDay: 'fa-sun' };
      const minTemp = daily.temperature_2m_min[i];
      const maxTemp = daily.temperature_2m_max[i];
      const rainProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

      const leftPercent = Math.max(0, Math.min(100, ((minTemp - minGlobal) / rangeGlobal) * 100));
      const widthPercent = Math.max(10, Math.min(100 - leftPercent, ((maxTemp - minTemp) / rangeGlobal) * 100));

      const row = document.createElement('div');
      row.className = 'daily-row';
      row.innerHTML = `
        <div class="daily-day-wrap">
          <span class="daily-day-name">${sanitizeHTML(dayName)}</span>
          <span class="daily-date-sub">${sanitizeHTML(formattedDate)}</span>
        </div>
        <div class="daily-cond-wrap">
          <div class="daily-cond-icon"><i class="fa-solid ${sanitizeIcon(info.iconDay)}"></i></div>
          <span class="daily-cond-name">${sanitizeHTML(info.desc)}</span>
        </div>
        <div class="daily-temp-bar-wrap">
          <span class="temp-min-label">${formatTemp(minTemp)}</span>
          <div class="temp-bar-track">
            <div class="temp-bar-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
          </div>
          <span class="temp-max-label">${formatTemp(maxTemp)}</span>
        </div>
        <div class="daily-rain-badge">
          <i class="fa-solid fa-umbrella"></i> ${Number(rainProb)}%
        </div>
      `;
      container.appendChild(row);
    }
  }

  // ------------------------------------------------------------
  // 7. APPLICATION CONTROLLER
  // ------------------------------------------------------------

  async function loadWeatherForLocation(location, saveToRecent = true) {
    const validated = validateLocation(location);
    if (!validated) {
      showToast('Data koordinat lokasi tidak valid.', 'fa-triangle-exclamation');
      return;
    }

    showLoading(true);
    hideError();

    state.currentLocation = { ...validated };

    try {
      const [weather, airQuality] = await Promise.all([
        fetchWeatherData(validated.latitude, validated.longitude),
        fetchAirQualityData(validated.latitude, validated.longitude)
      ]);

      state.weatherData = weather;
      state.airQualityData = airQuality;

      renderWeatherDashboard();
      showLoading(false);

      safeStorage.set(STORAGE_KEYS.LAST_LOCATION, validated);

      if (saveToRecent) {
        addRecentSearch(validated);
      }
    } catch (error) {
      console.error('Weather load error:', error);
      showLoading(false);
      showError('Gagal Mengambil Data Cuaca', error.message || 'Periksa koneksi internet Anda atau coba cari kota lain.');
    }
  }

  function showLoading(show) {
    const skeleton = document.getElementById('loadingSkeleton');
    const content = document.getElementById('weatherContent');
    if (show) {
      skeleton.classList.remove('hidden');
      content.style.opacity = '0.3';
      content.style.pointerEvents = 'none';
    } else {
      skeleton.classList.add('hidden');
      content.style.opacity = '1';
      content.style.pointerEvents = 'auto';
    }
  }

  function showError(title, desc) {
    const errorBox = document.getElementById('errorState');
    const content = document.getElementById('weatherContent');
    document.getElementById('errorMessageTitle').textContent = sanitizeHTML(title);
    document.getElementById('errorMessageDesc').textContent = sanitizeHTML(desc);
    errorBox.classList.remove('hidden');
    content.classList.add('hidden');
  }

  function hideError() {
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('weatherContent').classList.remove('hidden');
  }

  function handleGeolocation() {
    if (!navigator.geolocation) {
      showToast('Browser Anda tidak mendukung deteksi lokasi.', 'fa-circle-exclamation');
      return;
    }

    showToast('Mendeteksi lokasi Anda...', 'fa-location-crosshairs');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!isFinite(lat) || !isFinite(lon)) {
          showToast('Koordinat GPS tidak valid.', 'fa-triangle-exclamation');
          return;
        }

        const geoInfo = await reverseGeocode(lat, lon);
        const loc = validateLocation({
          name: geoInfo.name,
          country: geoInfo.country,
          latitude: lat,
          longitude: lon
        });

        if (loc) {
          loadWeatherForLocation(loc, true);
          showToast(`Lokasi terdeteksi: ${loc.name}`, 'fa-check');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        let msg = 'Izin lokasi tidak diberikan.';
        if (err.code === 1) {
          if (window.location.protocol === 'file:') {
            msg = 'Akses GPS dibatasi keamanan browser pada file lokal (file://). Silakan cari nama kota di kolom atas atau buka via web/Live Server.';
          } else {
            msg = 'Akses lokasi terblokir di browser laptop. Klik ikon gembok/setelan di sebelah URL browser dan ubah Lokasi menjadi "Izinkan".';
          }
        } else if (err.code === 2) {
          msg = 'Sinyal lokasi / GPS tidak terdeteksi pada laptop ini. Silakan gunakan kolom pencarian kota.';
        } else if (err.code === 3) {
          msg = 'Waktu deteksi lokasi habis. Silakan coba lagi.';
        }
        showToast(msg, 'fa-triangle-exclamation');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }

  // ------------------------------------------------------------
  // 8. GLOBAL & LOCAL SEARCH AUTOCOMPLETE
  // ------------------------------------------------------------

  function setupSearchAutocomplete() {
    const input = document.getElementById('citySearchInput');
    const dropdown = document.getElementById('autocompleteDropdown');
    const clearBtn = document.getElementById('btnClearSearch');

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().slice(0, 75);

      if (q.length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');

      clearTimeout(state.searchDebounceTimer);
      if (q.length < 2) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
      }

      // Deteksi format koordinat langsung (contoh: "-6.2, 106.8" atau "48.85, 2.35")
      const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[3]);
        if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          dropdown.innerHTML = '';
          const coordItem = document.createElement('div');
          coordItem.className = 'ac-item';
          coordItem.id = 'acCoordItem';
          coordItem.innerHTML = `
            <div>
              <span class="ac-item-city"><i class="fa-solid fa-map-pin"></i> Koordinat: ${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
              <span class="ac-item-country">(Titik Bumi Bebas)</span>
              <span class="ac-badge ac-badge-global">GPS</span>
            </div>
            <i class="fa-solid fa-arrow-right" style="color: var(--primary);"></i>
          `;
          dropdown.appendChild(coordItem);
          dropdown.classList.remove('hidden');

          coordItem.addEventListener('click', async () => {
            input.value = '';
            clearBtn.classList.add('hidden');
            dropdown.classList.add('hidden');
            const geo = await reverseGeocode(lat, lon);
            const validated = validateLocation({ name: geo.name, country: geo.country, latitude: lat, longitude: lon });
            if (validated) loadWeatherForLocation(validated, true);
          });
          return;
        }
      }

      state.searchDebounceTimer = setTimeout(async () => {
        const lowerQ = q.toLowerCase();
        let combinedResults = [];

        // 1. Cari di database Indonesia
        if (window.INDONESIA_REGIONS && Array.isArray(window.INDONESIA_REGIONS)) {
          window.INDONESIA_REGIONS.forEach(p => {
            if (p && Array.isArray(p.cities)) {
              p.cities.forEach(c => {
                if (c && typeof c.name === 'string') {
                  if (c.name.toLowerCase().includes(lowerQ) || String(p.province).toLowerCase().includes(lowerQ)) {
                    combinedResults.push({
                      name: c.name,
                      admin1: p.province,
                      country: 'Indonesia',
                      latitude: c.lat,
                      longitude: c.lon,
                      isIndonesia: true
                    });
                  }
                }
              });
            }
          });
        }

        // 2. Cari di database Dunia
        if (window.WORLD_REGIONS && Array.isArray(window.WORLD_REGIONS)) {
          window.WORLD_REGIONS.forEach(cont => {
            if (cont && Array.isArray(cont.countries)) {
              cont.countries.forEach(cntry => {
                if (cntry && Array.isArray(cntry.cities)) {
                  cntry.cities.forEach(c => {
                    if (c && typeof c.name === 'string') {
                      if (c.name.toLowerCase().includes(lowerQ) || String(cntry.country).toLowerCase().includes(lowerQ)) {
                        combinedResults.push({
                          name: c.name,
                          admin1: cont.continent,
                          country: cntry.country,
                          latitude: c.lat,
                          longitude: c.lon,
                          isIndonesia: false
                        });
                      }
                    }
                  });
                }
              });
            }
          });
        }

        // 3. Cari di Open-Meteo Geocoding API secara Global
        const apiResults = await searchWorldCities(q);
        apiResults.forEach(item => {
          if (item && isFinite(item.latitude) && isFinite(item.longitude)) {
            const isDup = combinedResults.some(
              r => Math.abs(r.latitude - item.latitude) < 0.1 && Math.abs(r.longitude - item.longitude) < 0.1
            );
            if (!isDup) {
              combinedResults.push({
                name: item.name || 'Kota',
                admin1: item.admin1 || '',
                country: item.country || 'Global',
                latitude: item.latitude,
                longitude: item.longitude,
                isIndonesia: (item.country_code === 'ID' || item.country === 'Indonesia')
              });
            }
          }
        });

        combinedResults = combinedResults.slice(0, 10);

        if (combinedResults.length === 0) {
          dropdown.innerHTML = '<div class="ac-item" style="color: var(--text-muted); font-style: italic;">Daerah tidak ditemukan. Coba ketik nama kota lain atau koordinat.</div>';
          dropdown.classList.remove('hidden');
          return;
        }

        dropdown.innerHTML = '';
        combinedResults.forEach((city) => {
          const item = document.createElement('div');
          item.className = 'ac-item';
          const adminStr = city.admin1 ? `${city.admin1}, ` : '';
          const badgeClass = city.isIndonesia ? 'ac-badge-id' : 'ac-badge-global';
          const badgeLabel = city.isIndonesia ? 'Indonesia' : 'Global';

          item.innerHTML = `
            <div>
              <span class="ac-item-city">${sanitizeHTML(city.name)}</span>
              <span class="ac-item-country">(${sanitizeHTML(adminStr)}${sanitizeHTML(city.country)})</span>
              <span class="ac-badge ${badgeClass}">${badgeLabel}</span>
            </div>
            <i class="fa-solid fa-magnifying-glass" style="color: var(--text-muted); font-size: 0.75rem;"></i>
          `;

          item.addEventListener('click', () => {
            input.value = '';
            clearBtn.classList.add('hidden');
            dropdown.classList.add('hidden');

            const validated = validateLocation({
              name: city.name,
              country: city.country,
              latitude: city.latitude,
              longitude: city.longitude
            });

            if (validated) {
              loadWeatherForLocation(validated, true);
            }
          });

          dropdown.appendChild(item);
        });

        dropdown.classList.remove('hidden');
      }, 280);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      dropdown.classList.add('hidden');
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstItem = dropdown.querySelector('.ac-item');
        if (firstItem && !dropdown.classList.contains('hidden')) {
          firstItem.click();
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.add('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // ------------------------------------------------------------
  // 9. JELAJAHI DAERAH DUNIA & INDONESIA MODAL
  // ------------------------------------------------------------

  function setupRegionsModal() {
    const scopeBtnIndo = document.getElementById('scopeBtnIndonesia');
    const scopeBtnGlobal = document.getElementById('scopeBtnGlobal');
    const searchInput = document.getElementById('modalRegionSearchInput');
    const subDropdown = document.getElementById('regionSubDropdown');

    scopeBtnIndo.addEventListener('click', () => {
      state.modalScope = 'indonesia';
      state.activeModalFilter = 'all';
      state.activeModalSub = 'all';
      scopeBtnIndo.classList.add('active');
      scopeBtnGlobal.classList.remove('active');
      renderModalControls();
      renderModalRegions();
    });

    scopeBtnGlobal.addEventListener('click', () => {
      state.modalScope = 'global';
      state.activeModalFilter = 'all';
      state.activeModalSub = 'all';
      scopeBtnGlobal.classList.add('active');
      scopeBtnIndo.classList.remove('active');
      renderModalControls();
      renderModalRegions();
    });

    subDropdown.addEventListener('change', (e) => {
      state.activeModalSub = sanitizeHTML(e.target.value);
      renderModalRegions();
    });

    searchInput.addEventListener('input', () => {
      renderModalRegions();
    });

    renderModalControls();
    renderModalRegions();
  }

  function renderModalControls() {
    const chipsContainer = document.getElementById('regionFilterChips');
    const subDropdown = document.getElementById('regionSubDropdown');
    const subLabel = document.getElementById('subSelectorLabel');

    chipsContainer.innerHTML = '';
    subDropdown.innerHTML = '<option value="all">-- Semua --</option>';

    if (state.modalScope === 'indonesia') {
      subLabel.innerHTML = '<i class="fa-solid fa-building-columns"></i> Pilih Provinsi:';
      const islands = ['all', 'Jawa', 'Sumatera', 'Kalimantan', 'Sulawesi', 'Bali & Nusa Tenggara', 'Maluku & Papua'];

      islands.forEach(isl => {
        const btn = document.createElement('button');
        btn.className = `island-chip ${state.activeModalFilter === isl ? 'active' : ''}`;
        btn.textContent = isl === 'all' ? 'Semua Pulau' : isl;
        btn.addEventListener('click', () => {
          state.activeModalFilter = isl;
          chipsContainer.querySelectorAll('.island-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderModalRegions();
        });
        chipsContainer.appendChild(btn);
      });

      if (window.INDONESIA_REGIONS && Array.isArray(window.INDONESIA_REGIONS)) {
        window.INDONESIA_REGIONS.forEach(p => {
          if (p && p.province) {
            const opt = document.createElement('option');
            opt.value = p.province;
            opt.textContent = `${p.province} (${p.island || ''})`;
            subDropdown.appendChild(opt);
          }
        });
      }

    } else {
      subLabel.innerHTML = '<i class="fa-solid fa-globe"></i> Pilih Negara:';
      const continents = ['all', 'Asia Timur & Tenggara', 'Timur Tengah & Asia Selatan', 'Eropa', 'Amerika', 'Oseania & Pasifik', 'Afrika & Daerah Kutub'];

      continents.forEach(cont => {
        const btn = document.createElement('button');
        btn.className = `island-chip ${state.activeModalFilter === cont ? 'active' : ''}`;
        btn.textContent = cont === 'all' ? 'Semua Benua' : cont;
        btn.addEventListener('click', () => {
          state.activeModalFilter = cont;
          chipsContainer.querySelectorAll('.island-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderModalRegions();
        });
        chipsContainer.appendChild(btn);
      });

      if (window.WORLD_REGIONS && Array.isArray(window.WORLD_REGIONS)) {
        window.WORLD_REGIONS.forEach(cont => {
          if (cont && Array.isArray(cont.countries)) {
            cont.countries.forEach(cntry => {
              if (cntry && cntry.country) {
                const opt = document.createElement('option');
                opt.value = cntry.country;
                opt.textContent = `${cntry.country} (${cont.continent || ''})`;
                subDropdown.appendChild(opt);
              }
            });
          }
        });
      }
    }
  }

  function renderModalRegions() {
    const container = document.getElementById('regionsDisplayContainer');
    const rawVal = document.getElementById('modalRegionSearchInput').value.trim();
    const searchVal = sanitizeHTML(rawVal).toLowerCase();
    const counterText = document.getElementById('regionsCounterText');
    container.innerHTML = '';

    let totalVisible = 0;

    if (state.modalScope === 'indonesia') {
      if (!window.INDONESIA_REGIONS || !Array.isArray(window.INDONESIA_REGIONS)) return;

      const filtered = window.INDONESIA_REGIONS.filter(p => {
        if (!p) return false;
        const matchIsland = state.activeModalFilter === 'all' || p.island === state.activeModalFilter;
        const matchSub = state.activeModalSub === 'all' || p.province === state.activeModalSub;
        return matchIsland && matchSub;
      });

      filtered.forEach(p => {
        if (!p || !Array.isArray(p.cities)) return;
        const matchingCities = p.cities.filter(c => {
          if (!c || typeof c.name !== 'string') return false;
          if (!searchVal) return true;
          return c.name.toLowerCase().includes(searchVal) || String(p.province).toLowerCase().includes(searchVal);
        });

        if (matchingCities.length === 0) return;
        totalVisible += matchingCities.length;

        const group = document.createElement('div');
        group.className = 'province-group';
        group.innerHTML = `
          <div class="province-group-header">
            <div class="province-title">
              <i class="fa-solid fa-map-pin text-primary"></i> ${sanitizeHTML(p.province)}
            </div>
            <span class="province-island-tag">${sanitizeHTML(p.island)}</span>
          </div>
          <div class="cities-chips-grid"></div>
        `;

        const chipsGrid = group.querySelector('.cities-chips-grid');
        matchingCities.forEach(city => {
          const chip = document.createElement('button');
          chip.className = 'city-select-chip';
          chip.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${sanitizeHTML(city.name)}</span>`;
          chip.addEventListener('click', () => {
            const validated = validateLocation({
              name: city.name,
              country: `${p.province}, Indonesia`,
              latitude: city.lat,
              longitude: city.lon
            });
            if (validated) {
              loadWeatherForLocation(validated, true);
              closeModal('regionsModal');
            }
          });
          chipsGrid.appendChild(chip);
        });

        container.appendChild(group);
      });

      counterText.textContent = `Menampilkan ${totalVisible} Daerah / Kabupaten / Kota di Indonesia`;

    } else {
      if (!window.WORLD_REGIONS || !Array.isArray(window.WORLD_REGIONS)) return;

      const filteredContinents = window.WORLD_REGIONS.filter(cont => {
        if (!cont) return false;
        return state.activeModalFilter === 'all' || cont.continent === state.activeModalFilter;
      });

      filteredContinents.forEach(cont => {
        if (!cont || !Array.isArray(cont.countries)) return;
        const filteredCountries = cont.countries.filter(cntry => {
          if (!cntry) return false;
          return state.activeModalSub === 'all' || cntry.country === state.activeModalSub;
        });

        filteredCountries.forEach(cntry => {
          if (!cntry || !Array.isArray(cntry.cities)) return;
          const matchingCities = cntry.cities.filter(c => {
            if (!c || typeof c.name !== 'string') return false;
            if (!searchVal) return true;
            return c.name.toLowerCase().includes(searchVal) || String(cntry.country).toLowerCase().includes(searchVal);
          });

          if (matchingCities.length === 0) return;
          totalVisible += matchingCities.length;

          const group = document.createElement('div');
          group.className = 'province-group';
          group.innerHTML = `
            <div class="province-group-header">
              <div class="province-title">
                <i class="fa-solid fa-earth-americas text-primary"></i> ${sanitizeHTML(cntry.country)}
              </div>
              <span class="province-island-tag">${sanitizeHTML(cont.continent)}</span>
            </div>
            <div class="cities-chips-grid"></div>
          `;

          const chipsGrid = group.querySelector('.cities-chips-grid');
          matchingCities.forEach(city => {
            const chip = document.createElement('button');
            chip.className = 'city-select-chip';
            chip.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${sanitizeHTML(city.name)}</span>`;
            chip.addEventListener('click', () => {
              const validated = validateLocation({
                name: city.name,
                country: cntry.country,
                latitude: city.lat,
                longitude: city.lon
              });
              if (validated) {
                loadWeatherForLocation(validated, true);
                closeModal('regionsModal');
              }
            });
            chipsGrid.appendChild(chip);
          });

          container.appendChild(group);
        });
      });

      counterText.textContent = `Menampilkan ${totalVisible} Kota & Daerah di Seluruh Dunia`;
    }

    if (totalVisible === 0) {
      container.innerHTML = '<p class="empty-state-text" style="padding: 20px; text-align: center;">Tidak ada daerah yang cocok dengan kata kunci pencarian Anda.</p>';
    }
  }

  // ------------------------------------------------------------
  // 10. FAVORITES & RECENT SEARCHES
  // ------------------------------------------------------------

  function updateFavoriteStarState() {
    const starBtn = document.getElementById('btnToggleFavorite');
    const isFav = state.favorites.some(
      f => Math.abs(f.latitude - state.currentLocation.latitude) < 0.05 &&
           Math.abs(f.longitude - state.currentLocation.longitude) < 0.05
    );

    if (isFav) {
      starBtn.classList.add('active');
      starBtn.title = 'Hapus dari kota favorit';
      starBtn.innerHTML = '<i class="fa-solid fa-star text-gold"></i>';
    } else {
      starBtn.classList.remove('active');
      starBtn.title = 'Simpan sebagai kota favorit';
      starBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
    }

    updateFavoritesBadge();
  }

  function toggleCurrentFavorite() {
    const loc = validateLocation(state.currentLocation);
    if (!loc) return;

    const index = state.favorites.findIndex(
      f => Math.abs(f.latitude - loc.latitude) < 0.05 && Math.abs(f.longitude - loc.longitude) < 0.05
    );

    if (index >= 0) {
      state.favorites.splice(index, 1);
      showToast(`${loc.name} dihapus dari favorit.`, 'fa-star');
    } else {
      state.favorites.push({ ...loc });
      showToast(`${loc.name} disimpan ke favorit!`, 'fa-star');
    }

    safeStorage.set(STORAGE_KEYS.FAVORITES, state.favorites);
    updateFavoriteStarState();
    renderFavoritesModal();
  }

  function updateFavoritesBadge() {
    const badge = document.getElementById('favCountBadge');
    if (state.favorites.length > 0) {
      badge.textContent = state.favorites.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function addRecentSearch(loc) {
    const validated = validateLocation(loc);
    if (!validated) return;

    state.recentSearches = state.recentSearches.filter(
      r => r.name.toLowerCase() !== validated.name.toLowerCase()
    );
    state.recentSearches.unshift({ ...validated });
    if (state.recentSearches.length > 8) state.recentSearches.pop();
    safeStorage.set(STORAGE_KEYS.RECENT, state.recentSearches);
    renderFavoritesModal();
  }

  function renderFavoritesModal() {
    const favList = document.getElementById('favoritesList');
    const recentList = document.getElementById('recentSearchesList');

    if (state.favorites.length === 0) {
      favList.innerHTML = '<p class="empty-state-text">Belum ada kota yang ditandai bintang. Klik ikon bintang pada kota untuk menyimpannya di sini.</p>';
    } else {
      favList.innerHTML = '';
      state.favorites.forEach((fav, idx) => {
        const item = document.createElement('div');
        item.className = 'fav-item';
        item.innerHTML = `
          <div class="fav-item-info">
            <span class="fav-item-city">${sanitizeHTML(fav.name)}</span>
            <span class="fav-item-country">${sanitizeHTML(fav.country || '')}</span>
          </div>
          <button class="btn-remove-fav" data-idx="${idx}" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
        `;
        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-remove-fav')) {
            e.stopPropagation();
            state.favorites.splice(idx, 1);
            safeStorage.set(STORAGE_KEYS.FAVORITES, state.favorites);
            updateFavoriteStarState();
            renderFavoritesModal();
            return;
          }
          loadWeatherForLocation(fav, true);
          closeModal('favoritesModal');
        });
        favList.appendChild(item);
      });
    }

    if (state.recentSearches.length === 0) {
      recentList.innerHTML = '<p class="empty-state-text">Belum ada riwayat pencarian.</p>';
    } else {
      recentList.innerHTML = '';
      state.recentSearches.forEach((rec) => {
        const item = document.createElement('div');
        item.className = 'fav-item';
        item.innerHTML = `
          <div class="fav-item-info">
            <span class="fav-item-city">${sanitizeHTML(rec.name)}</span>
            <span class="fav-item-country">${sanitizeHTML(rec.country || '')}</span>
          </div>
          <i class="fa-solid fa-arrow-right" style="color: var(--text-muted); font-size: 0.8rem;"></i>
        `;
        item.addEventListener('click', () => {
          loadWeatherForLocation(rec, false);
          closeModal('favoritesModal');
        });
        recentList.appendChild(item);
      });
    }
  }

  // ------------------------------------------------------------
  // 11. THEME & UNIT MANAGEMENT
  // ------------------------------------------------------------

  function applyTheme(theme) {
    state.theme = (theme === 'dark' || theme === 'light') ? theme : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    safeStorage.set(STORAGE_KEYS.THEME, state.theme);

    const label = document.getElementById('themeToggleText');
    if (label) {
      label.textContent = state.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap';
    }
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    showToast(`Beralih ke ${nextTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}`, nextTheme === 'dark' ? 'fa-moon' : 'fa-sun');
  }

  function setUnit(unit) {
    const cleanUnit = (unit === 'F' || unit === 'C') ? unit : 'C';
    if (state.unit === cleanUnit) return;
    state.unit = cleanUnit;
    safeStorage.set(STORAGE_KEYS.UNIT, cleanUnit);

    document.getElementById('btnUnitC').classList.toggle('active', cleanUnit === 'C');
    document.getElementById('btnUnitF').classList.toggle('active', cleanUnit === 'F');

    renderWeatherDashboard();
    showToast(`Satuan suhu diubah ke °${cleanUnit}`);
  }

  // ------------------------------------------------------------
  // 12. MODAL & EVENT LISTENERS
  // ------------------------------------------------------------

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  function setupModals() {
    const openRegions = () => {
      renderModalRegions();
      openModal('regionsModal');
      setTimeout(() => {
        document.getElementById('modalRegionSearchInput').focus();
      }, 150);
    };

    document.getElementById('btnBrowseRegions').addEventListener('click', openRegions);
    document.getElementById('footerBtnBrowse').addEventListener('click', openRegions);
    document.getElementById('btnCloseRegionsModal').addEventListener('click', () => closeModal('regionsModal'));
    document.getElementById('btnCloseRegionsModalBtn').addEventListener('click', () => closeModal('regionsModal'));

    document.getElementById('btnFavoritesModal').addEventListener('click', () => {
      renderFavoritesModal();
      openModal('favoritesModal');
    });
    document.getElementById('btnCloseFavModal').addEventListener('click', () => closeModal('favoritesModal'));
    document.getElementById('btnCloseFavModalBtn').addEventListener('click', () => closeModal('favoritesModal'));

    const openSec = () => openModal('securityModal');
    document.getElementById('btnSecurityModal').addEventListener('click', openSec);
    document.getElementById('footerBtnSecurity').addEventListener('click', openSec);
    document.getElementById('btnCloseSecModal').addEventListener('click', () => closeModal('securityModal'));
    document.getElementById('btnCloseSecModalBtn').addEventListener('click', () => closeModal('securityModal'));

    document.getElementById('btnClearAllBrowserData').addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menghapus semua preferensi tema, favorit, dan riwayat yang tersimpan di browser Anda?')) {
        safeStorage.clearAll();
        state.favorites = [];
        state.recentSearches = [];
        updateFavoriteStarState();
        renderFavoritesModal();
        closeModal('securityModal');
        showToast('Semua data lokal berhasil dibersihkan dengan aman!', 'fa-trash-can');
      }
    });

    document.getElementById('btnClearRecentHistory').addEventListener('click', () => {
      state.recentSearches = [];
      safeStorage.set(STORAGE_KEYS.RECENT, []);
      renderFavoritesModal();
      showToast('Riwayat pencarian telah dihapus.');
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  function setupEventListeners() {
    document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);
    document.getElementById('footerBtnTheme').addEventListener('click', toggleTheme);

    document.getElementById('btnUnitC').addEventListener('click', () => setUnit('C'));
    document.getElementById('btnUnitF').addEventListener('click', () => setUnit('F'));

    document.getElementById('btnToggleFavorite').addEventListener('click', toggleCurrentFavorite);
    document.getElementById('btnGeoLocation').addEventListener('click', handleGeolocation);

    document.getElementById('brandLogo').addEventListener('click', () => {
      loadWeatherForLocation(state.currentLocation, false);
      showToast('Memperbarui data cuaca terkini...', 'fa-rotate');
    });

    document.getElementById('btnRetryWeather').addEventListener('click', () => {
      loadWeatherForLocation(state.currentLocation, false);
    });

    document.querySelectorAll('.city-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const validated = validateLocation({
          name: pill.getAttribute('data-name'),
          country: pill.getAttribute('data-country'),
          latitude: parseFloat(pill.getAttribute('data-lat')),
          longitude: parseFloat(pill.getAttribute('data-lon'))
        });
        if (validated) {
          loadWeatherForLocation(validated, true);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal('regionsModal');
        closeModal('favoritesModal');
        closeModal('securityModal');
      }
    });
  }

  // ------------------------------------------------------------
  // 13. APPLICATION BOOTSTRAP
  // ------------------------------------------------------------
  function initApp() {
    const savedTheme = safeStorage.get(STORAGE_KEYS.THEME);
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }

    const savedUnit = safeStorage.get(STORAGE_KEYS.UNIT, 'C');
    setUnit(savedUnit);

    state.favorites = safeStorage.get(STORAGE_KEYS.FAVORITES, []);
    state.recentSearches = safeStorage.get(STORAGE_KEYS.RECENT, []);
    updateFavoritesBadge();

    setupSearchAutocomplete();
    setupRegionsModal();
    setupModals();
    setupEventListeners();

    const lastLoc = safeStorage.get(STORAGE_KEYS.LAST_LOCATION, DEFAULT_CITY);
    loadWeatherForLocation(lastLoc, false);

    initWorldMap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
