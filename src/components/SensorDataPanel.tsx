'use client'

import { useState, useEffect } from 'react'
import { getLatestSensorReadings } from '@/utils/thingspeak/client' // Updated path
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Wifi, Clock, ArrowUpRight, Thermometer, Gauge, Scale, Zap, RefreshCw, Trash2 } from 'lucide-react'

interface SensorReading {
  name: string
  value: string
  unit: string
}

interface SensorData {
  timestamp: string
  sensors: SensorReading[]
}

// Function to get fill level color based on value
const getFillLevelColor = (value: string): string => {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) return 'bg-gray-400'; // Default for non-numeric values

  // Assuming lower value means fuller (closer distance)
  if (numValue < 10) return 'bg-red-500'; // Example: less than 10cm = High
  if (numValue < 30) return 'bg-yellow-500'; // Example: 10-30cm = Medium
  return 'bg-green-500'; // Example: >30cm = Low
}

// Function to get status text based on fill level
const getFillLevelStatus = (value: string): string => {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) return 'Unknown';

  if (numValue < 10) return 'High';
  if (numValue < 30) return 'Medium';
  return 'Low';
}

// Function to calculate fill percentage (assuming max distance is 50cm, adjust as needed)
const calculateFillPercentage = (value: string): number => {
  const numValue = parseFloat(value);
  const maxDistance = 50; // Max distance sensor reads (e.g., 50cm)
  const minDistance = 5;  // Min distance sensor reads (e.g., 5cm)

  if (isNaN(numValue)) return 0;

  // Clamp the value within min/max distance
  const clampedValue = Math.max(minDistance, Math.min(maxDistance, numValue));

  // Calculate percentage (inverted: lower distance means fuller)
  const percentage = 100 - ((clampedValue - minDistance) / (maxDistance - minDistance)) * 100;
  return Math.round(Math.max(0, Math.min(100, percentage))); // Ensure percentage is between 0 and 100
}

export default function SensorDataPanel() {
  const [data, setData] = useState<SensorData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<string>('')
  const [binDistance, setBinDistance] = useState<string>('N/A')
  const [binFillPercentage, setBinFillPercentage] = useState<number>(0)

  const fetchData = async () => {
    try {
      // Don't show loader on interval refresh, only initial
      if (!data) setLoading(true);
      console.log('Fetching ThingSpeak data...');

      const readings = await getLatestSensorReadings();
      console.log('ThingSpeak data received:', readings);

      if (readings) {
        setData(readings);
        setLastFetchTime(new Date().toLocaleTimeString());
        setError(null); // Clear previous errors

        // Look for bin fill level data (ultrasonic sensor distance)
        const distanceSensor = readings.sensors.find(sensor =>
          sensor.name.toLowerCase().includes('ultrasonic') ||
          sensor.name.toLowerCase().includes('distance')
        );

        if (distanceSensor) {
          setBinDistance(distanceSensor.value);
          setBinFillPercentage(calculateFillPercentage(distanceSensor.value));
        } else {
          setBinDistance('N/A');
          setBinFillPercentage(0);
        }
      } else {
        // Don't set error if data is just temporarily unavailable, keep showing old data
        console.warn('No sensor data available from ThingSpeak this cycle');
        // setError('No sensor data available from ThingSpeak');
      }
    } catch (err) {
      console.error('Error fetching sensor data:', err);
      setError('Failed to fetch sensor data. Check connection or API key.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(); // Fetch immediately
    const intervalId = setInterval(fetchData, 15000); // Refresh every 15 seconds
    return () => clearInterval(intervalId); // Clean up
  }, []);

  const getSensorIcon = (sensorName: string) => {
    const name = sensorName.toLowerCase();
    if (name.includes('ir') || name.includes('infrared')) return <Activity className="h-4 w-4 text-primary" />;
    if (name.includes('ultrasonic') || name.includes('distance')) return <Wifi className="h-4 w-4 text-primary" />;
    if (name.includes('weight') || name.includes('mass')) return <Scale className="h-4 w-4 text-primary" />;
    if (name.includes('temperature')) return <Thermometer className="h-4 w-4 text-primary" />;
    if (name.includes('humidity')) return <Gauge className="h-4 w-4 text-primary" />;
    return <Zap className="h-4 w-4 text-primary" />;
  }

  const fillLevelColor = getFillLevelColor(binDistance);
  const fillLevelStatus = getFillLevelStatus(binDistance);

  return (
    <div className="space-y-4">
      {/* Header with Last Updated Time */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">Live Bin Status</h3>
        <div className={`flex items-center text-xs ${loading && !data ? 'text-yellow-400 animate-pulse' : 'text-white/60'}`}>
          <Clock className="h-3 w-3 mr-1.5" />
          <span>
            {loading && !data
              ? 'Initializing...'
              : loading
              ? 'Updating...'
              : lastFetchTime
              ? `Last updated: ${lastFetchTime}`
              : 'Awaiting data...'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-center mb-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-white flex items-center justify-center mx-auto"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </button>
        </div>
      )}

      {/* Bin Fill Level Indicator Card */}
      <Card className="bg-card/50 backdrop-blur-md border-white/10 overflow-hidden">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center">
            <Trash2 className={`h-4 w-4 mr-2 ${fillLevelColor.replace('bg-', 'text-')}`} />
            <CardTitle className="text-sm font-medium text-white">Bin Fill Level</CardTitle>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${fillLevelColor.replace('bg-', 'text-')} ${fillLevelColor}/20 border ${fillLevelColor.replace('bg-', 'border-')}/30`}>
            {fillLevelStatus}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="relative h-3 w-full bg-white/10 rounded-full overflow-hidden mt-1">
            <div
              className={`absolute top-0 left-0 h-full ${fillLevelColor} transition-all duration-500 ease-out`}
              style={{ width: `${binFillPercentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-white/60">Empty</span>
            <span className="text-sm font-medium text-white">{`${binFillPercentage}%`} Full</span>
            <span className="text-xs text-white/60">Full</span>
          </div>
        </CardContent>
      </Card>

      {/* Individual Sensor Readings (if available) */}
      {data?.sensors && data.sensors.length > 0 && (
        <div className="pt-4">
           <h4 className="text-md font-semibold text-white mb-3">Other Sensor Details</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.sensors.map((sensor, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-md border-white/10 overflow-hidden">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center">
                    {getSensorIcon(sensor.name)}
                    <CardTitle className="text-xs font-medium ml-2 text-white/90">{sensor.name}</CardTitle>
                  </div>
                  {/* <ArrowUpRight className="h-3 w-3 text-primary/70" /> */}
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <div className="flex items-end justify-between">
                    <div className="text-xl font-bold text-white">{sensor.value}</div>
                    {sensor.unit && <div className="text-xs text-white/60 ml-1 mb-0.5">{sensor.unit}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Fallback when no sensors detected but connection ok */}
      {!loading && data && (!data.sensors || data.sensors.length === 0) && !error && (
        <div className="rounded-lg bg-card/30 backdrop-blur-md border border-white/10 p-6 text-center mt-4">
          <Activity className="h-8 w-8 mx-auto mb-2 text-white/40" />
          <p className="text-white/70">No detailed sensor data available currently.</p>
        </div>
      )}

    </div>
  )
} 