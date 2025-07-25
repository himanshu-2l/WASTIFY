export interface ThingSpeakData {
  channel_id: number;
  feeds: ThingSpeakFeed[];
  channel: {
    name: string;
    description: string;
    field1: string;
    field2: string;
    field3: string;
    field4: string;
    field5: string;
    field6: string;
    field7: string;
    field8: string;
  };
}

export interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;
  field1?: string; // IR Sensor
  field2?: string; // Ultrasonic Sensor
  field3?: string; // Weight Sensor
  field4?: string; // Other sensor
  field5?: string; // Other sensor
  field6?: string; // Other sensor
  field7?: string; // Other sensor
  field8?: string; // Other sensor
}

export async function fetchThingSpeakData(): Promise<ThingSpeakData> {
  try {
    // Use hardcoded values for now - TODO: Move to environment variables
    const channelId = '2922015'; // Replace with process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID
    const apiKey = 'U65BMCG70BV4ZTAJ';   // Replace with process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY

    console.log(`Fetching ThingSpeak data for channel: ${channelId}`);

    const response = await fetch(
      `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=10`,
      { cache: 'no-store' } // Fetch fresh data every time
    );

    if (!response.ok) {
      console.error(`ThingSpeak API returned status: ${response.status}`);
      throw new Error(`Failed to fetch data from ThingSpeak: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('ThingSpeak API response:', data);

    return data;
  } catch (error) {
    console.error('Error fetching ThingSpeak data:', error);
    throw error;
  }
}

// Function to get latest sensor readings
export async function getLatestSensorReadings() {
  try {
    const data = await fetchThingSpeakData();

    if (!data?.feeds || data.feeds.length === 0) {
      console.log('No feeds found in ThingSpeak data');
      return null;
    }

    // Get the most recent feed
    const latestFeed = data.feeds[data.feeds.length - 1];
    console.log('Latest feed:', latestFeed);

    // Get field names from channel metadata
    const fieldNames = {
      field1: data.channel.field1 || 'IR Sensor',
      field2: data.channel.field2 || 'Ultrasonic Sensor',
      field3: data.channel.field3 || 'Weight Sensor',
      field4: data.channel.field4 || 'Sensor 4',
      field5: data.channel.field5 || 'Sensor 5',
      field6: data.channel.field6 || 'Sensor 6',
      field7: data.channel.field7 || 'Sensor 7',
      field8: data.channel.field8 || 'Sensor 8',
    };

    // Create readings object
    const readings = {
      timestamp: new Date(latestFeed.created_at).toLocaleString(),
      sensors: Object.entries(fieldNames)
        .filter(([key]) => {
          const keyExists = key in latestFeed;
          const valueExists = latestFeed[key as keyof ThingSpeakFeed] !== undefined &&
                              latestFeed[key as keyof ThingSpeakFeed] !== null &&
                              latestFeed[key as keyof ThingSpeakFeed] !== '';
          return keyExists && valueExists;
        })
        .map(([key, name]) => ({
          name,
          value: latestFeed[key as keyof ThingSpeakFeed] || 'N/A',
          unit: getUnitForSensor(name),
        })),
    };

    console.log('Processed sensor readings:', readings);
    return readings;
  } catch (error) {
    console.error('Error getting latest sensor readings:', error);
    return null;
  }
}

// Helper function to determine unit based on sensor name
function getUnitForSensor(sensorName: string): string {
  const lowerName = sensorName.toLowerCase();

  if (lowerName.includes('ultrasonic') || lowerName.includes('distance')) {
    return 'cm'; // Assuming distance relates to fill level % inverse? Might need adjustment.
  } else if (lowerName.includes('weight') || lowerName.includes('mass')) {
    return 'g';
  } else if (lowerName.includes('temperature')) {
    return '°C';
  } else if (lowerName.includes('humidity')) {
    return '%';
  } else if (lowerName.includes('ir') || lowerName.includes('infrared')) {
    // IR might indicate presence (1/0) or a simple status
    return 'status';
  } else {
    return ''; // Default unit if unknown
  }
} 