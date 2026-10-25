/**
 * ============================================================
 * CUACAKINI - CORE JAVASCRIPT APPLICATION
 * Prakiraan Cuaca Publik, Cepat, Akurat, Nyaman & Aman
 * ============================================================
 */

(() => {
  'use strict';

  // ------------------------------------------------------------
  // 1. CONSTANTS & WMO WEATHER DICTIONARY
  // ------------------------------------------------------------
  const STORAGE_KEYS = {
    THEME: 'cuacakini_theme',
    UNIT: 'cuacakini_unit',
    FAVORITES: 'cuacakini_favorites',
    RECENT: 'cuacakini_recent',
    LAST_LOCATION: 'cuacakini_last_loc'
  };

  const DEFAULT_CITY = {
    name: 'Jakarta',
    country: 'Indonesia',
    latitude: -6.2088,
    longitude: 106.8456
  };

  /**
   * WMO Weather Interpretation Codes (WMO 4501)
   * Dilengkapi terjemahan Bahasa Indonesia & FontAwesome Icons
   */
  const WMO_WEATHER = {
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
  };

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
    searchDebounceTimer: null
  };

  // ------------------------------------------------------------
  // 3. SECURITY & HELPER UTILITIES
  // ------------------------------------------------------------

  /**
   * Mencegah serangan XSS (Cross-Site Scripting) dengan sanitasi teks
   */
  function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Helper aman untuk mengakses LocalStorage (menghindari crash pada private browsing)
   */
  const safeStorage = {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (err) {
        console.warn('Storage read warning:', err);
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

  /**
   * Konversi Suhu Celsius <-> Fahrenheit
   */
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

  /**
   * Konversi derajat mata angin ke nama arah mata angin Indonesia
   */
  function getWindDirectionText(degrees) {
    if (degrees === undefined || degrees === null) return 'Variabel';
    const directions = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
    const index = Math.round((degrees % 360) / 45) % 8;
    return directions[index];
  }

  /**
   * Klasifikasi Indeks UV
   */
  function getUvIndexDescription(uv) {
    if (uv === null || uv === undefined) return 'Tidak tersedia';
    if (uv <= 2) return `${Math.round(uv)} (Rendah)`;
    if (uv <= 5) return `${Math.round(uv)} (Sedang)`;
    if (uv <= 7) return `${Math.round(uv)} (Tinggi)`;
    if (uv <= 10) return `${Math.round(uv)} (Sangat Tinggi)`;
    return `${Math.round(uv)} (Ekstrem)`;
  }

  /**
   * Klasifikasi European Air Quality Index (AQI)
   */
  function getAqiDescription(aqi) {
    if (!aqi) return 'Baik (AQI --)';
    if (aqi <= 20) return `Sangat Baik (AQI ${Math.round(aqi)})`;
    if (aqi <= 40) return `Baik (AQI ${Math.round(aqi)})`;
    if (aqi <= 60) return `Sedang (AQI ${Math.round(aqi)})`;
    if (aqi <= 80) return `Kurang Sehat (AQI ${Math.round(aqi)})`;
    if (aqi <= 100) return `Tidak Sehat (AQI ${Math.round(aqi)})`;
    return `Berbahaya (AQI ${Math.round(aqi)})`;
  }

  /**
   * Toast notification ringan dan aman
   */
  function showToast(message, icon = 'fa-circle-info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${sanitizeHTML(icon)}"></i> <span>${sanitizeHTML(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ------------------------------------------------------------
  // 4. API FETCHING SERVICES (OPEN-METEO)
  // ------------------------------------------------------------

  /**
   * Mengambil data cuaca lengkap dari Open-Meteo API
   */
  async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

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

  /**
   * Mengambil data Kualitas Udara (AQI) dari Open-Meteo Air Quality API
   */
  async function fetchAirQualityData(lat, lon) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5`;
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

  /**
   * Pencarian Kota (Geocoding API)
   */
  async function searchCities(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQuery = encodeURIComponent(query.trim().slice(0, 60));
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cleanQuery}&count=6&language=id&format=json`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.warn('Geocoding error:', err);
      return [];
    }
  }

  /**
   * Reverse Geocoding aman (Mencari nama kota dari koordinat GPS pengguna)
   */
  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const cityName = data.city || data.locality || data.principalSubdivision || 'Lokasi Saya';
        const countryName = data.countryName || 'Indonesia';
        return { name: cityName, country: countryName };
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    }
    return { name: 'Lokasi Anda', country: 'Deteksi Otomatis' };
  }

  // ------------------------------------------------------------
  // 5. DOM RENDERING LOGIC
  // ------------------------------------------------------------

  /**
   * Render seluruh data cuaca ke layar
   */
  function renderWeatherDashboard() {
    const w = state.weatherData;
    if (!w || !w.current) return;

    const current = w.current;
    const daily = w.daily;
    const hourly = w.hourly;
    const isDay = current.is_day === 1;
    const wCode = current.weather_code;
    const weatherInfo = WMO_WEATHER[wCode] || { desc: 'Cerah', iconDay: 'fa-sun text-gold', iconNight: 'fa-moon text-primary' };

    // 1. Lokasi & Tanggal
    document.getElementById('cwCityName').textContent = state.currentLocation.name;
    document.getElementById('cwCountryName').textContent = state.currentLocation.country;

    // Waktu lokal berdasarkan timezone kota
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

    // 2. Status Bintang Favorit
    updateFavoriteStarState();

    // 3. Ikon Cuaca Utama
    const iconClass = isDay ? weatherInfo.iconDay : weatherInfo.iconNight;
    const iconElem = document.getElementById('cwWeatherIcon');
    iconElem.innerHTML = `<i class="fa-solid ${sanitizeHTML(iconClass)} icon-weather-main"></i>`;

    // 4. Suhu Utama & Kondisi
    document.getElementById('cwTempNumber').textContent = getTempNumber(current.temperature_2m);
    document.getElementById('cwTempUnitSymbol').textContent = `°${state.unit}`;
    document.getElementById('cwConditionText').textContent = weatherInfo.desc;

    // Rentang Suhu Hari Ini
    if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
      document.getElementById('cwTempMax').textContent = formatTemp(daily.temperature_2m_max[0]);
      document.getElementById('cwTempMin').textContent = formatTemp(daily.temperature_2m_min[0]);
    }
    document.getElementById('cwFeelsLike').textContent = formatTemp(current.apparent_temperature);

    // 5. Highlights: Hujan, UV, AQI
    const rainChance = (daily && daily.precipitation_probability_max && daily.precipitation_probability_max[0] !== undefined)
      ? `${daily.precipitation_probability_max[0]}%`
      : '0%';
    document.getElementById('cwRainChance').textContent = rainChance;

    const uvMax = (daily && daily.uv_index_max && daily.uv_index_max.length > 0) ? daily.uv_index_max[0] : null;
    document.getElementById('cwUvIndex').textContent = getUvIndexDescription(uvMax);

    const aqiVal = (state.airQualityData && state.airQualityData.current) ? state.airQualityData.current.european_aqi : null;
    document.getElementById('cwAqiText').textContent = getAqiDescription(aqiVal);

    // 6. Kartu Metrik Detail
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

    // Sunrise & Sunset
    if (daily && daily.sunrise && daily.sunrise.length > 0) {
      const sunriseTime = daily.sunrise[0].split('T')[1]?.slice(0, 5) || '05:30';
      document.getElementById('metricSunrise').textContent = sunriseTime;
    }
    if (daily && daily.sunset && daily.sunset.length > 0) {
      const sunsetTime = daily.sunset[0].split('T')[1]?.slice(0, 5) || '18:00';
      document.getElementById('metricSunset').textContent = sunsetTime;
    }

    // 7. Render Hourly Forecast (24 Jam)
    renderHourlyForecast(hourly, w.timezone);

    // 8. Render 7-Day Forecast
    renderDailyForecast(daily);
  }

  /**
   * Render Prakiraan 24 Jam ke Depan
   */
  function renderHourlyForecast(hourly, timezone) {
    const container = document.getElementById('hourlyForecastContainer');
    container.innerHTML = '';

    if (!hourly || !hourly.time) return;

    // Temukan jam saat ini berdasarkan ISO string
    const nowISO = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    let startIndex = hourly.time.findIndex(t => t.startsWith(nowISO));
    if (startIndex === -1) startIndex = 0;

    // Ambil 24 jam ke depan
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
      card.innerHTML = `
        <span class="hourly-time">${idx === 0 ? 'Sekarang' : sanitizeHTML(hourOnly)}</span>
        <div class="hourly-icon"><i class="fa-solid ${sanitizeHTML(icon)}"></i></div>
        <span class="hourly-temp">${formatTemp(temp)}</span>
        <span class="hourly-rain" title="Peluang Hujan"><i class="fa-solid fa-droplet"></i> ${rainProb}%</span>
      `;
      container.appendChild(card);
    });
  }

  /**
   * Render Prakiraan 7 Hari
   */
  function renderDailyForecast(daily) {
    const container = document.getElementById('dailyForecastContainer');
    container.innerHTML = '';

    if (!daily || !daily.time) return;

    // Temukan rentang suhu global untuk penskalaan visual bar
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

      // Hitung posisi visual range bar (%)
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
          <div class="daily-cond-icon"><i class="fa-solid ${sanitizeHTML(info.iconDay)}"></i></div>
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
          <i class="fa-solid fa-umbrella"></i> ${rainProb}%
        </div>
      `;
      container.appendChild(row);
    }
  }

  // ------------------------------------------------------------
  // 6. APPLICATION CONTROLLER & ACTIONS
  // ------------------------------------------------------------

  /**
   * Muat Cuaca Berdasarkan Lokasi
   */
  async function loadWeatherForLocation(location, saveToRecent = true) {
    showLoading(true);
    hideError();

    state.currentLocation = { ...location };

    try {
      // Fetch paralel cuaca & kualitas udara
      const [weather, airQuality] = await Promise.all([
        fetchWeatherData(location.latitude, location.longitude),
        fetchAirQualityData(location.latitude, location.longitude)
      ]);

      state.weatherData = weather;
      state.airQualityData = airQuality;

      renderWeatherDashboard();
      showLoading(false);

      // Simpan lokasi terakhir
      safeStorage.set(STORAGE_KEYS.LAST_LOCATION, location);

      // Simpan ke riwayat pencarian
      if (saveToRecent) {
        addRecentSearch(location);
      }
    } catch (error) {
      console.error('Weather load failed:', error);
      showLoading(false);
      showError('Gagal Mengambil Data Cuaca', 'Periksa koneksi internet Anda atau coba cari kota lain.');
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
    document.getElementById('errorMessageTitle').textContent = title;
    document.getElementById('errorMessageDesc').textContent = desc;
    errorBox.classList.remove('hidden');
    content.classList.add('hidden');
  }

  function hideError() {
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('weatherContent').classList.remove('hidden');
  }

  /**
   * Deteksi Lokasi Pengguna via Geolocation API
   */
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

        const geoInfo = await reverseGeocode(lat, lon);
        const loc = {
          name: geoInfo.name,
          country: geoInfo.country,
          latitude: lat,
          longitude: lon
        };

        loadWeatherForLocation(loc, true);
        showToast(`Lokasi terdeteksi: ${loc.name}`, 'fa-check');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        let msg = 'Izin lokasi tidak diberikan. Menampilkan kota default.';
        if (err.code === 1) msg = 'Izin akses lokasi ditolak oleh pengguna.';
        else if (err.code === 2) msg = 'Sinyal lokasi tidak tersedia.';
        else if (err.code === 3) msg = 'Waktu deteksi lokasi habis.';
        showToast(msg, 'fa-triangle-exclamation');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }

  // ------------------------------------------------------------
  // 7. FAVORITES & RECENT SEARCHES MANAGEMENT
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
    const loc = state.currentLocation;
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
    // Hindari duplikat
    state.recentSearches = state.recentSearches.filter(
      r => r.name.toLowerCase() !== loc.name.toLowerCase()
    );
    state.recentSearches.unshift({ ...loc });
    if (state.recentSearches.length > 8) state.recentSearches.pop();
    safeStorage.set(STORAGE_KEYS.RECENT, state.recentSearches);
    renderFavoritesModal();
  }

  function renderFavoritesModal() {
    const favList = document.getElementById('favoritesList');
    const recentList = document.getElementById('recentSearchesList');

    // Render Favorites
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

    // Render Recent
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
  // 8. SEARCH AUTOCOMPLETE & INPUT HANDLING
  // ------------------------------------------------------------
  function setupSearchAutocomplete() {
    const input = document.getElementById('citySearchInput');
    const dropdown = document.getElementById('autocompleteDropdown');
    const clearBtn = document.getElementById('btnClearSearch');

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim();

      if (q.length > 0) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');

      clearTimeout(state.searchDebounceTimer);
      if (q.length < 2) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
      }

      // Debounce pencarian 300ms untuk performa efisien
      state.searchDebounceTimer = setTimeout(async () => {
        const results = await searchCities(q);
        if (results.length === 0) {
          dropdown.innerHTML = '<div class="ac-item" style="color: var(--text-muted); font-style: italic;">Kota tidak ditemukan</div>';
          dropdown.classList.remove('hidden');
          return;
        }

        dropdown.innerHTML = '';
        results.forEach((city) => {
          const item = document.createElement('div');
          item.className = 'ac-item';
          const adminStr = city.admin1 ? `${city.admin1}, ` : '';
          item.innerHTML = `
            <div>
              <span class="ac-item-city">${sanitizeHTML(city.name)}</span>
              <span class="ac-item-country">(${sanitizeHTML(adminStr)}${sanitizeHTML(city.country || '')})</span>
            </div>
            <i class="fa-solid fa-magnifying-glass" style="color: var(--text-muted); font-size: 0.75rem;"></i>
          `;

          item.addEventListener('click', () => {
            input.value = '';
            clearBtn.classList.add('hidden');
            dropdown.classList.add('hidden');

            const newLoc = {
              name: city.name,
              country: city.country || 'Indonesia',
              latitude: city.latitude,
              longitude: city.longitude
            };
            loadWeatherForLocation(newLoc, true);
          });

          dropdown.appendChild(item);
        });

        dropdown.classList.remove('hidden');
      }, 300);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      dropdown.classList.add('hidden');
      input.focus();
    });

    // Enter key
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

    // Tutup autocomplete jika klik di luar
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper')) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // ------------------------------------------------------------
  // 9. THEME & UNIT TOGGLE LOGIC
  // ------------------------------------------------------------

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    safeStorage.set(STORAGE_KEYS.THEME, theme);

    const label = document.getElementById('themeToggleText');
    if (label) {
      label.textContent = theme === 'dark' ? 'Mode Terang' : 'Mode Gelap';
    }
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    showToast(`Beralih ke ${nextTheme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}`, nextTheme === 'dark' ? 'fa-moon' : 'fa-sun');
  }

  function setUnit(unit) {
    if (state.unit === unit) return;
    state.unit = unit;
    safeStorage.set(STORAGE_KEYS.UNIT, unit);

    document.getElementById('btnUnitC').classList.toggle('active', unit === 'C');
    document.getElementById('btnUnitF').classList.toggle('active', unit === 'F');

    // Render ulang angka suhu
    renderWeatherDashboard();
    showToast(`Satuan suhu diubah ke °${unit}`);
  }

  // ------------------------------------------------------------
  // 10. MODAL HANDLING & INITIALIZATION
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
    // Favorites Modal
    document.getElementById('btnFavoritesModal').addEventListener('click', () => {
      renderFavoritesModal();
      openModal('favoritesModal');
    });
    document.getElementById('btnCloseFavModal').addEventListener('click', () => closeModal('favoritesModal'));
    document.getElementById('btnCloseFavModalBtn').addEventListener('click', () => closeModal('favoritesModal'));

    // Security Modal
    const openSec = () => openModal('securityModal');
    document.getElementById('btnSecurityModal').addEventListener('click', openSec);
    document.getElementById('footerBtnSecurity').addEventListener('click', openSec);
    document.getElementById('btnCloseSecModal').addEventListener('click', () => closeModal('securityModal'));
    document.getElementById('btnCloseSecModalBtn').addEventListener('click', () => closeModal('securityModal'));

    // Clear All Browser Data (Security feature)
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

    // Clear Recent Search History
    document.getElementById('btnClearRecentHistory').addEventListener('click', () => {
      state.recentSearches = [];
      safeStorage.set(STORAGE_KEYS.RECENT, []);
      renderFavoritesModal();
      showToast('Riwayat pencarian telah dihapus.');
    });

    // Tutup modal jika klik backdrop
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });
  }

  function setupEventListeners() {
    // Theme buttons
    document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);
    document.getElementById('footerBtnTheme').addEventListener('click', toggleTheme);

    // Units
    document.getElementById('btnUnitC').addEventListener('click', () => setUnit('C'));
    document.getElementById('btnUnitF').addEventListener('click', () => setUnit('F'));

    // Favorite star
    document.getElementById('btnToggleFavorite').addEventListener('click', toggleCurrentFavorite);

    // Geolocation
    document.getElementById('btnGeoLocation').addEventListener('click', handleGeolocation);

    // Brand logo refresh
    document.getElementById('brandLogo').addEventListener('click', () => {
      loadWeatherForLocation(state.currentLocation, false);
      showToast('Memperbarui data cuaca terkini...', 'fa-rotate');
    });

    // Retry button on error
    document.getElementById('btnRetryWeather').addEventListener('click', () => {
      loadWeatherForLocation(state.currentLocation, false);
    });

    // Quick City Pills
    document.querySelectorAll('.city-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const loc = {
          name: pill.getAttribute('data-name'),
          country: pill.getAttribute('data-country'),
          latitude: parseFloat(pill.getAttribute('data-lat')),
          longitude: parseFloat(pill.getAttribute('data-lon'))
        };
        loadWeatherForLocation(loc, true);
      });
    });

    // Keyboard accessibility for ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal('favoritesModal');
        closeModal('securityModal');
      }
    });
  }

  // ------------------------------------------------------------
  // 11. APPLICATION BOOTSTRAP
  // ------------------------------------------------------------
  function initApp() {
    // 1. Pulihkan Tema dari Storage atau Deteksi Sistem
    const savedTheme = safeStorage.get(STORAGE_KEYS.THEME);
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }

    // 2. Pulihkan Satuan Suhu
    const savedUnit = safeStorage.get(STORAGE_KEYS.UNIT, 'C');
    setUnit(savedUnit);

    // 3. Pulihkan Favorit & Riwayat
    state.favorites = safeStorage.get(STORAGE_KEYS.FAVORITES, []);
    state.recentSearches = safeStorage.get(STORAGE_KEYS.RECENT, []);
    updateFavoritesBadge();

    // 4. Setup Komponen & Events
    setupSearchAutocomplete();
    setupModals();
    setupEventListeners();

    // 5. Muat Cuaca: Gunakan Lokasi Terakhir atau Default Jakarta
    const lastLoc = safeStorage.get(STORAGE_KEYS.LAST_LOCATION, DEFAULT_CITY);
    loadWeatherForLocation(lastLoc, false);
  }

  // Jalankan ketika DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
