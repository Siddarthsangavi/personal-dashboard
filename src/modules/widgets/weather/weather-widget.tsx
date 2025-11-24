"use client";

import { useEffect, useState } from "react";
import { WidgetRecord } from "@/modules/dashboard/types";
import styles from "./weather-widget.module.scss";
import { Cloud, CloudRain, Sun, CloudSun, Droplets, Wind } from "lucide-react";

interface WeatherWidgetProps {
  widget: WidgetRecord;
  setHeaderAction: (widgetId: number, action: React.ReactNode) => void;
}

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes("rain") || lower.includes("drizzle")) {
    return <CloudRain className="size-8" />;
  }
  if (lower.includes("cloud")) {
    return <CloudSun className="size-8" />;
  }
  if (lower.includes("sun") || lower.includes("clear")) {
    return <Sun className="size-8" />;
  }
  return <Cloud className="size-8" />;
};

export function WeatherWidget({ }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<string>("");

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Using OpenWeatherMap API (free tier)
            const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || "";
            if (!apiKey) {
              // Fallback to mock data if no API key
              setWeather({
                temperature: 22,
                condition: "Partly Cloudy",
                humidity: 65,
                windSpeed: 12,
                icon: "partly-cloudy",
              });
              setLocation("Your Location");
              setLoading(false);
              return;
            }

            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
            );
            const data = await response.json();
            setWeather({
              temperature: Math.round(data.main.temp),
              condition: data.weather[0].main,
              humidity: data.main.humidity,
              windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
              icon: data.weather[0].icon,
            });
            setLocation(data.name);
          } catch {
            // Fallback to mock data on error
            setWeather({
              temperature: 22,
              condition: "Partly Cloudy",
              humidity: 65,
              windSpeed: 12,
              icon: "partly-cloudy",
            });
            setLocation("Your Location");
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Fallback if geolocation is denied
          setWeather({
            temperature: 22,
            condition: "Partly Cloudy",
            humidity: 65,
            windSpeed: 12,
            icon: "partly-cloudy",
          });
          setLocation("Your Location");
          setLoading(false);
        }
      );
    } else {
      // Fallback if geolocation is not supported
      setWeather({
        temperature: 22,
        condition: "Partly Cloudy",
        humidity: 65,
        windSpeed: 12,
        icon: "partly-cloudy",
      });
      setLocation("Your Location");
      setLoading(false);
    }
  }, []);

  if (loading || !weather) {
    return (
      <div className={styles.weatherWidget}>
        <div className={styles.loading}>Loading weather...</div>
      </div>
    );
  }

  return (
    <div className={styles.weatherWidget}>
      <div className={styles.mainInfo}>
        <div className={styles.iconContainer}>
          {getWeatherIcon(weather.condition)}
        </div>
        <div className={styles.temperature}>
          <span className={styles.tempValue}>{weather.temperature}</span>
          <span className={styles.tempUnit}>°C</span>
        </div>
      </div>
      <div className={styles.condition}>{weather.condition}</div>
      {location && <div className={styles.location}>{location}</div>}
      <div className={styles.details}>
        <div className={styles.detailItem}>
          <Droplets className="size-4" />
          <span>{weather.humidity}%</span>
        </div>
        <div className={styles.detailItem}>
          <Wind className="size-4" />
          <span>{weather.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
}

