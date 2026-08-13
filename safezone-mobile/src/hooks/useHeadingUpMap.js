import { useCallback, useEffect, useRef, useState } from "react";

const isValidHeading = (heading) => Number.isFinite(Number(heading)) && Number(heading) >= 0;

function useHeadingUpMap(mapRef, location) {
  const [headingUp, setHeadingUp] = useState(true);
  const headingRef = useRef(0);

  const animateToLocation = useCallback((nextLocation, nextHeading = headingRef.current, duration = 450) => {
    if (!mapRef.current || !nextLocation) return;

    const latitude = Number(nextLocation.latitude);
    const longitude = Number(nextLocation.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const numericHeading = isValidHeading(nextHeading) ? Number(nextHeading) : headingRef.current;
    headingRef.current = numericHeading;

    mapRef.current.animateCamera(
      {
        center: { latitude, longitude },
        heading: headingUp ? numericHeading : 0,
        pitch: headingUp ? 45 : 0,
        zoom: 17,
      },
      { duration }
    );
  }, [headingUp, mapRef]);

  useEffect(() => {
    if (location) {
      animateToLocation(location, location.heading);
    }
  }, [location?.latitude, location?.longitude, location?.heading, animateToLocation]);

  const toggleNorthUp = useCallback(() => {
    setHeadingUp((current) => {
      const nextHeadingUp = !current;
      if (mapRef.current && location) {
        mapRef.current.animateCamera(
          {
            center: {
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
            },
            heading: nextHeadingUp ? headingRef.current : 0,
            pitch: nextHeadingUp ? 45 : 0,
            zoom: 17,
          },
          { duration: 350 }
        );
      }
      return nextHeadingUp;
    });
  }, [location, mapRef]);

  return { headingUp, toggleNorthUp, animateToLocation };
}

export default useHeadingUpMap;
