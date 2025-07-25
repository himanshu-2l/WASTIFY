'use client'
import { useState, useEffect } from 'react'
import { Trash2, MapPin, CheckCircle, Clock, ArrowRight, Camera, Upload, Loader, Calendar, Weight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { getWasteCollectionTasks, updateTaskStatus, saveReward, saveCollectedWaste, getUserByEmail } from '@/utils/db/actions'
import { GoogleGenerativeAI } from "@google/generative-ai"

// Make sure to set your Gemini API key in your environment variables
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

type CollectionTask = {
  id: number
  location: string
  wasteType: string
  amount: string
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  date: string
  collectorId: number | null
}

const ITEMS_PER_PAGE = 5

export default function CollectPage() {
  const [tasks, setTasks] = useState<CollectionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredWasteType, setHoveredWasteType] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)

  useEffect(() => {
    const fetchUserAndTasks = async () => {
      setLoading(true)
      try {
        // Fetch user
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          if (fetchedUser) {
            setUser(fetchedUser)
          } else {
            toast.error('User not found. Please log in again.')
            // Redirect to login page or handle this case appropriately
          }
        } else {
          toast.error('User not logged in. Please log in.')
          // Redirect to login page or handle this case appropriately
        }

        // Fetch tasks
        const fetchedTasks = await getWasteCollectionTasks()
        setTasks(fetchedTasks as CollectionTask[])
      } catch (error) {
        console.error('Error fetching user and tasks:', error)
        toast.error('Failed to load user data and tasks. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndTasks()
  }, [])

  const [selectedTask, setSelectedTask] = useState<CollectionTask | null>(null)
  const [verificationImage, setVerificationImage] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteTypeMatch: boolean;
    quantityMatch: boolean;
    confidence: number;
  } | null>(null)
  const [reward, setReward] = useState<number | null>(null)

  const handleStatusChange = async (taskId: number, newStatus: CollectionTask['status']) => {
    if (!user) {
      toast.error('Please log in to collect waste.')
      return
    }

    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus, user.id)
      if (updatedTask) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus, collectorId: user.id } : task
        ))
        toast.success('Task status updated successfully')
      } else {
        toast.error('Failed to update task status. Please try again.')
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status. Please try again.')
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setVerificationImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const readFileAsBase64 = (dataUrl: string): string => {
    return dataUrl.split(',')[1]
  }

  const handleVerify = async () => {
    if (!selectedTask || !verificationImage || !user) {
      toast.error('Missing required information for verification.')
      return
    }

    setVerificationStatus('verifying')
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      const base64Data = readFileAsBase64(verificationImage)

      const imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg', // Adjust this if you know the exact type
          },
        },
      ]

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
        1. Confirm if the waste type matches: ${selectedTask.wasteType}
        2. Estimate if the quantity matches: ${selectedTask.amount}
        3. Your confidence level in this assessment (as a percentage)
        
        Respond in JSON format like this:
        {
          "wasteTypeMatch": true/false,
          "quantityMatch": true/false,
          "confidence": confidence level as a number between 0 and 1
        }`

      const result = await model.generateContent([prompt, ...imageParts])
      const response = await result.response

      const text = response.text()

      
      try {
        const cleanedText = text.replace(/```json|```/g, '').trim();
        const parsedResult = JSON.parse(cleanedText)
        setVerificationResult({
          wasteTypeMatch: parsedResult.wasteTypeMatch,
          quantityMatch: parsedResult.quantityMatch,
          confidence: parsedResult.confidence
        })
        setVerificationStatus('success')
        
        if (parsedResult.wasteTypeMatch && parsedResult.quantityMatch && parsedResult.confidence > 0.7) {
          await handleStatusChange(selectedTask.id, 'verified')
          const earnedReward = Math.floor(Math.random() * 50) + 10 // Random reward between 10 and 59
          
          // Save the reward
          await saveReward(user.id, earnedReward)

          // Save the collected waste
          await saveCollectedWaste(selectedTask.id, user.id, parsedResult)

          setReward(earnedReward)
          toast.success(`Verification successful! You earned ${earnedReward} tokens!`, {
            duration: 5000,
            position: 'top-center',
          })
        } else {
          toast.error('Verification failed. The collected waste does not match the reported waste.', {
            duration: 5000,
            position: 'top-center',
          })
        }
      } catch (error) {
        console.log(error);
        
        console.error('Failed to parse JSON response:', text)
        setVerificationStatus('failure')
      }
    } catch (error) {
      console.error('Error verifying waste:', error)
      setVerificationStatus('failure')
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pageCount = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Responsive Header: Stack title and search on mobile */}
      <div className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          <span className="text-primary">Waste</span> Collection Tasks
        </h1>
        
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-primary/60" />
          </div>
          <Input
            type="text"
            placeholder="Search by area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 rounded-xl text-white placeholder-white/50 focus:border-primary/50 focus:ring-primary/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <Loader className="animate-spin h-10 w-10 text-primary mb-3" />
            <p className="text-white/60">Loading collection tasks...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map(task => (
                <div 
                  key={task.id} 
                  className="glass-effect rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_15px_rgba(25,184,92,0.15)] hover:border-primary/30"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Left side with location and badge */}
                    <div className="p-6 md:w-1/3 md:border-r border-white/10 flex flex-col">
                      <div className="flex items-start justify-between md:flex-col md:items-start mb-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <h2 className="text-xl font-semibold text-white">{task.location}</h2>
                        </div>
                        {/* Add margin-top on mobile when status is below location */}
                        <StatusBadge status={task.status} className="mt-3 md:mt-4 shrink-0" /> 
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="flex items-center text-white/60 text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-primary/70" />
                          <span>Reported: {task.date}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side with details */}
                    <div className="p-6 md:w-2/3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Waste Type</p>
                          <div className="flex items-center">
                            <Trash2 className="h-4 w-4 mr-2 text-primary" />
                            <p className="text-white font-medium">{task.wasteType}</p>
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Estimated Amount</p>
                          <div className="flex items-center">
                            <Weight className="h-4 w-4 mr-2 text-primary" />
                            <p className="text-white font-medium">{task.amount}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Responsive Button Alignment */}
                      <div className="flex flex-col sm:flex-row sm:justify-end mt-4">
                        {task.status === 'pending' && (
                          <Button 
                            onClick={() => handleStatusChange(task.id, 'in_progress')}
                            className="w-full sm:w-auto rounded-full bg-primary hover:bg-primary/90 text-white"
                          >
                            Start Collection
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                        
                        {task.status === 'in_progress' && task.collectorId === user?.id && (
                          <Button 
                            onClick={() => {
                              setSelectedTask(task)
                              setVerificationImage(null)
                              setVerificationStatus('idle')
                              setVerificationResult(null)
                              setReward(null)
                            }}
                            className="w-full sm:w-auto rounded-full bg-primary hover:bg-primary/90 text-white"
                          >
                            Complete Collection
                            <CheckCircle className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                        
                        {task.status === 'completed' && (
                          <div className="flex items-center gap-2 text-white/60">
                            <Clock className="h-5 w-5 text-amber-400" />
                            <span className="text-amber-400">Awaiting verification</span>
                          </div>
                        )}
                        
                        {task.status === 'verified' && (
                          <div className="flex items-center gap-2 text-white/60">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-green-400">Verified & Collected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center rounded-2xl glass-effect">
                <Trash2 className="h-12 w-12 mx-auto mb-4 text-white/20" />
                <h3 className="text-xl font-medium text-white mb-2">No collection tasks found</h3>
                <p className="text-white/60">Try adjusting your search or check back later for new tasks.</p>
              </div>
            )}
          </div>
        
          {/* Pagination controls */}
          {pageCount > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex flex-wrap justify-center gap-2" aria-label="Pagination">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="px-2 py-1 disabled:opacity-50"
                >
                  Previous
                </Button>
                {Array.from({ length: pageCount }).map((_, i) => (
                  <Button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    className={`w-8 h-8 ${currentPage === i + 1 ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                  disabled={currentPage === pageCount}
                  variant="outline"
                  size="sm"
                  className="px-2 py-1 disabled:opacity-50"
                >
                  Next
                </Button>
              </nav>
            </div>
          )}
        </>
      )}

      {selectedTask && (
        // Themed Modal
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-effect rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <h3 className="text-xl font-semibold mb-4 text-white">Verify Collection</h3>
            <p className="mb-4 text-sm text-white/70">Upload a photo of the collected waste to verify and earn your reward.</p>
            <div className="mb-4">
              <label htmlFor="verification-image" className="block text-sm font-medium text-white/80 mb-2">
                Upload Image
              </label>
              {/* Themed Upload Area */}
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-xl bg-white/5 hover:border-primary/50 transition-colors duration-300">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-white/40" />
                  <div className="flex text-sm text-white/60 justify-center">
                    <label
                      htmlFor="verification-image"
                      className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-[#0A0F1C]"
                    >
                      <span>Upload a file</span>
                      <input id="verification-image" name="verification-image" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-white/50">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
            {verificationImage && (
              <img src={verificationImage} alt="Verification" className="mb-4 rounded-lg w-full object-contain max-h-60" />
            )}
            <Button
              onClick={handleVerify}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-full font-medium shadow-md"
              disabled={!verificationImage || verificationStatus === 'verifying'}
            >
              {verificationStatus === 'verifying' ? (
                <>
                  <Loader className="animate-spin mr-2 h-5 w-5" />
                  Verifying...
                </>
              ) : 'Verify Collection'}
            </Button>
            {verificationStatus === 'success' && verificationResult && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                <p className="text-primary">Waste Type Match: {verificationResult.wasteTypeMatch ? 'Yes' : 'No'}</p>
                <p className="text-primary">Quantity Match: {verificationResult.quantityMatch ? 'Yes' : 'No'}</p>
                <p className="text-primary">Confidence: {(verificationResult.confidence * 100).toFixed(2)}%</p>
              </div>
            )}
            {verificationStatus === 'failure' && (
              <p className="mt-2 text-destructive text-center text-sm">Verification failed. Please try again.</p>
            )}
            <Button onClick={() => setSelectedTask(null)} variant="outline" className="w-full mt-3 border-white/20 text-white/70 hover:bg-white/5 hover:text-white rounded-full">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Add a conditional render to show user info or login prompt */}
      {/* {user ? (
        <p className="text-sm text-gray-600 mb-4">Logged in as: {user.name}</p>
      ) : (
        <p className="text-sm text-red-600 mb-4">Please log in to collect waste and earn rewards.</p>
      )} */}
    </div>
  )
}

function StatusBadge({ status, className = "" }: { status: CollectionTask['status'], className?: string }) {
  let bgColor = "bg-gray-500 text-white"
  let icon = null
  
  switch (status) {
    case 'pending':
      bgColor = "bg-amber-500/20 text-amber-500"
      icon = <Clock className="h-3 w-3 mr-1" />
      break
    case 'in_progress':
      bgColor = "bg-blue-500/20 text-blue-500"
      icon = <ArrowRight className="h-3 w-3 mr-1" />
      break
    case 'completed':
      bgColor = "bg-orange-500/20 text-orange-500"
      icon = <CheckCircle className="h-3 w-3 mr-1" />
      break
    case 'verified':
      bgColor = "bg-green-500/20 text-green-500"
      icon = <CheckCircle className="h-3 w-3 mr-1" />
      break
  }
  
  return (
    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${className}`}>
      {icon}
      <span>{status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </div>
  )
}