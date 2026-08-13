const placeCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const normalizePhotonResults = (data) => {
  return (data.features || []).map((feature) => {
    const properties = feature.properties || {};
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    const displayName = [
      properties.name,
      properties.city || properties.county,
      properties.state,
      properties.country,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      place_id: `${properties.osm_type || "photon"}-${properties.osm_id || displayName}`,
      lat: String(latitude),
      lon: String(longitude),
      display_name: displayName || properties.name || "Unknown location",
    };
  });
};

const getPlaceSuggestions = async (req, res) => {
  try {
    const query = (req.query?.q || req.query?.query || "").trim();

    if (!query || query.length < 2) {
      return res.status(200).json([]);
    }

    const cacheKey = query.toLowerCase();
    const cached = placeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.results);
    }

    const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=lk`;

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "SafeZoneGuardians/1.0.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      await response.text();

      if (response.status === 429) {
        const fallbackResponse = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,
          { headers: { Accept: "application/json" } }
        );

        if (fallbackResponse.ok) {
          const fallbackResults = normalizePhotonResults(await fallbackResponse.json());
          placeCache.set(cacheKey, {
            results: fallbackResults,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          return res.status(200).json(fallbackResults);
        }
      }

      return res.status(200).json([]);
    }

    const data = await response.json();
    const results = Array.isArray(data) ? data : [];
    placeCache.set(cacheKey, {
      results,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return res.status(200).json(results);
  } catch (error) {
    console.log("Place search controller error:", error);
    return res.status(500).json({
      message: "Unable to search places",
      error: error.message,
    });
  }
};

module.exports = {
  getPlaceSuggestions,
};
