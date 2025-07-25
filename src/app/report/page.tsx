'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Trash2, MapPin, Upload, CheckCircle, XCircle, Loader, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createUser, getUserByEmail, createReport, updateRewardPoints, createNotification, getRecentReports, createTransaction } from '@/utils/db/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null; // clear timeoutId after execution
        resolve(func(...args));
      }, waitFor);
    });
}

// Type for Nominatim API results
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
}

export default function ReportPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const router = useRouter();

  const [reports, setReports] = useState<Array<{
    id: number;
    location: string;
    wasteType: string;
    amount: string;
    createdAt: string;
  }>>([]);

  const [newReport, setNewReport] = useState({
    location: '',
    type: '',
    amount: '',
  })

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        // IMPORTANT: Add a unique User-Agent header for Nominatim's usage policy
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          {
            headers: {
              'User-Agent': 'WastifyApp/1.0 (contact@yourapp.com)' // Replace with your app info
            }
          }
        );
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data: NominatimResult[] = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setSuggestions([]); // Clear suggestions on error
        toast.error('Failed to fetch address suggestions.');
      } finally {
        setIsSearching(false);
      }
    }, 500), // 500ms debounce
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === '') {
      setSuggestions([]); // Clear suggestions if input is empty
      setIsSearching(false);
    } else {
      setIsSearching(true); // Show loading indicator immediately
      debouncedSearch(query);
    }
  };

  const handleSuggestionClick = (suggestion: NominatimResult) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    setSearchQuery(suggestion.display_name); // Update search input with selected address
    setSuggestions([]); // Hide suggestions
    setNewReport(prev => ({
      ...prev,
      location: suggestion.display_name, // Use display name for location field
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewReport({ ...newReport, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVerify = async () => {
    if (!file) return;

    setVerificationStatus('verifying');

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type,
          },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
      1. The type of waste (e.g., plastic, paper, glass, metal, organic)
      2. An estimate of the quantity or amount (in kg or liters)
      3. Your confidence level in this assessment (as a percentage)
      
      Respond in JSON format like this:
      {
        "wasteType": "type of waste",
        "quantity": "estimated quantity with unit",
        "confidence": confidence level as a number between 0 and 1
      };`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;

      // Ensure you retrieve the text correctly
      const text = await response.text(); // Use await here to get the text

      console.log("Response Text:", text); // Log the response text for debugging

      try {
        // Clean the response text to remove any backticks or markdown formatting
        const cleanedText = text.replace(/```json|```/g, '').trim(); // Remove backticks and "json" label
        const parsedResult = JSON.parse(cleanedText); // Parse the cleaned text

        if (parsedResult.wasteType && parsedResult.quantity && parsedResult.confidence) {
          setVerificationResult(parsedResult);
          setVerificationStatus('success');
          setNewReport({
            ...newReport,
            type: parsedResult.wasteType,
            amount: parsedResult.quantity
          });
        } else {
          console.error('Invalid verification result:', parsedResult);
          setVerificationStatus('failure');
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', cleanedText, error); // Log the error for debugging
        setVerificationStatus('failure');
      }
    } catch (error) {
      console.error('Error verifying waste:', error);
      setVerificationStatus('failure');
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus !== 'success' || !user) {
      toast.error('Please verify the waste before submitting or log in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const report = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        verificationResult ? JSON.stringify(verificationResult) : undefined
      ) as any;

      const formattedReport = {
        id: report.id,
        location: report.location,
        wasteType: report.wasteType,
        amount: report.amount,
        createdAt: report.createdAt.toISOString().split('T')[0]
      };

      setReports([formattedReport, ...reports]);
      setNewReport({ location: '', type: '', amount: '' });
      setFile(null);
      setPreview(null);
      setVerificationStatus('idle');
      setVerificationResult(null);

      // The points are now awarded in the createReport function, so we don't need to do it here
      // We'll just display a success message
      toast.success(`Report submitted successfully! You've earned points for reporting waste.`);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      // This is a simple example. In a real app, you'd use a proper authentication system.
      const email = localStorage.getItem('userEmail');
      if (email) {
        let user = await getUserByEmail(email);
        if (!user) {
          user = await createUser(email, 'Anonymous User');
        }
        setUser(user);

        // Fetch recent reports
        const recentReports = await getRecentReports();
        const formattedReports = recentReports.map(report => ({
          ...report,
          createdAt: report.createdAt.toISOString().split('T')[0]
        }));
        setReports(formattedReports);
      } else {
        router.push('/login'); // Redirect to a login page if not authenticated
      }
    };
    checkUser();
  }, [router]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          <MapPin className="inline-block mr-3 h-8 w-8 text-primary" />
          Report Waste
        </h1>
        <p className="text-white/60 text-lg">Help keep our community clean by reporting waste locations.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-effect rounded-2xl p-6 sm:p-8 card-hover mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left Column: Image Upload and Verification */}
          <div className="space-y-4">
            <label htmlFor="waste-image" className="block text-base sm:text-lg font-medium text-white">
              Upload Waste Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-xl hover:border-primary/50 transition-colors duration-300 bg-white/5">
              <div className="space-y-3 text-center">
                {preview ? (
                  <img src={preview} alt="Waste preview" className="mx-auto h-40 w-auto rounded-lg object-cover" />
                ) : (
                  <Upload className="mx-auto h-12 w-12 text-white/40" />
                )}
                <div className="flex text-sm text-white/60 justify-center">
                  <label
                    htmlFor="waste-image"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-[#0A0F1C]"
                  >
                    <span>{preview ? 'Change file' : 'Upload a file'}</span>
                    <input id="waste-image" name="waste-image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-white/50">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
            {file && (
              <Button 
                onClick={handleVerify} 
                disabled={verificationStatus === 'verifying'} 
                className="w-full bg-secondary hover:bg-secondary/90 text-white rounded-full font-medium shadow-blue"
              >
                {verificationStatus === 'verifying' ? <Loader className="animate-spin h-5 w-5 mr-2" /> : null}
                Verify Waste with AI
              </Button>
            )}
            {verificationStatus === 'success' && (
              <div className="flex items-center p-3 rounded-lg bg-primary/10 text-primary border border-primary/30">
                <CheckCircle className="h-5 w-5 mr-2" />
                <p className="text-sm font-medium">Image verified successfully!</p>
              </div>
            )}
            {verificationStatus === 'failure' && (
              <div className="flex items-center p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
                <XCircle className="h-5 w-5 mr-2" />
                <p className="text-sm font-medium">Verification failed. Please try again.</p>
              </div>
            )}
          </div>

          {/* Right Column: Map and Location Input */}
          <div className="space-y-4">
            <label htmlFor="location" className="block text-base sm:text-lg font-medium text-white">
              Location
            </label>
            <p className="text-sm text-white/60 mb-2">
              Search for an address or enter it manually below.
            </p>
            {/* Address Search Input */}
            <div className="relative">
              <Input
                type="text"
                name="addressSearch"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search for address..."
                className="w-full bg-white/5 border-white/10 text-white/80 placeholder-white/50 focus:ring-primary/50 focus:border-primary/50 pl-10"
                autoComplete="off" // Disable browser autocomplete
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
              {isSearching && <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary animate-spin" />}
              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-[#121725] border border-white/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 text-sm text-white/80 hover:bg-primary/20 cursor-pointer"
                    >
                      {suggestion.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Location Input (now editable) */}
            <label htmlFor="location" className="block text-base sm:text-lg font-medium text-white mt-4">
              Location
            </label>
            <Input
              type="text"
              name="location"
              value={newReport.location}
              onChange={handleInputChange} // Allow manual input
              placeholder="Search above or enter address manually"
              className="w-full bg-white/5 border-white/10 text-white/80 placeholder-white/50 focus:ring-primary/50 focus:border-primary/50"
              required // Make location mandatory
            />
            
            <label htmlFor="type" className="block text-base sm:text-lg font-medium text-white mt-4">
              Waste Type (Verified)
            </label>
            <Input
              type="text"
              name="type"
              value={newReport.type}
              placeholder="Verify image to auto-fill" 
              className="w-full bg-white/5 border-white/10 text-white/80 placeholder-white/50 focus:ring-primary/50 focus:border-primary/50"
              readOnly
            />
            
            <label htmlFor="amount" className="block text-base sm:text-lg font-medium text-white mt-4">
              Estimated Amount (Verified)
            </label>
            <Input
              type="text"
              name="amount"
              value={newReport.amount}
              placeholder="Verify image to auto-fill"
              className="w-full bg-white/5 border-white/10 text-white/80 placeholder-white/50 focus:ring-primary/50 focus:border-primary/50"
              readOnly
            />
          </div>
        </div>

        <div className="text-center mt-8">
          <Button 
            type="submit" 
            disabled={verificationStatus !== 'success' || isSubmitting || !newReport.location}
            className="bg-eco-gradient hover:opacity-90 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-eco text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader className="animate-spin h-5 w-5 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {isSubmitting ? 'Submitting Report...' : 'Submit Verified Report'}
          </Button>
          {verificationStatus !== 'success' && (
             <p className="text-xs text-yellow-400/80 mt-2">Please upload and verify an image first.</p>
          )}
          {!newReport.location && verificationStatus === 'success' && (
             <p className="text-xs text-yellow-400/80 mt-2">Please enter or search for a location.</p>
          )}
        </div>
      </form>

      {/* Recent Reports Table */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-white">Recent Reports</h2>
        <div className="glass-effect rounded-2xl overflow-hidden">
          <div className="max-h-96 overflow-x-auto overflow-y-auto mask-linear-gradient">
            <table className="w-full min-w-[600px]">
              <thead className="bg-white/10 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {reports.length > 0 ? reports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <MapPin className="inline-block w-4 h-4 mr-2 text-secondary" />
                      {/* Display full location if it's likely an address, otherwise format coords */}
                      {report.location.includes(',') && /^-?\d+\.\d+, -?\d+\.\d+$/.test(report.location)
                       ? `Coords: ${report.location}`
                       : (report.location.substring(0, 30) + (report.location.length > 30 ? '...' : ''))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">{report.wasteType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">{report.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">{report.createdAt}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-white/60">
                      No recent reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}