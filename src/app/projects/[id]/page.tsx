"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
interface Iteration {
  id: string;
  number: number;
  status: string;
  enhancedPrompt?: string;
  videoUrl?: string;
  analysisResult?: {
    answer: "yes" | "no";
    explanation: string;
  };
}

interface ReferenceImage {
  id: string;
  url: string;
  filename: string;
}

interface Job {
  id: string;
  userPrompt: string; // Original prompt - never modified
  displayName?: string; // Custom name for sidebar display (set by rename)
  status: string;
  currentStage?: string;
  iterations: Iteration[];
  finalVideoUrl?: string;
  saved?: boolean; // Track if explicitly saved to sidebar
  referenceImages?: ReferenceImage[]; // Reference images used for this generation
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  // Form state
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("1080p");
  const [duration, setDuration] = useState<4 | 6 | 8>(8);
  const [retentionDays, setRetentionDays] = useState<number>(30);

  // Pipeline state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState(0);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]); // Only saved jobs appear in sidebar
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true); // Loading state for saved jobs

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");
  
  // Delete confirmation modal state
  const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load saved jobs from database on mount
  useEffect(() => {
    const loadSavedJobs = async () => {
      setIsLoadingJobs(true);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data?.jobs) {
            // Only load COMPLETED jobs as saved
            const jobs: Job[] = data.data.jobs
              .filter((job: { status: string }) => job.status === "COMPLETED")
              .map((job: {
                id: string;
                userPrompt: string;
                displayName?: string;
                status: string;
                currentStage?: string;
                finalVideoUrl?: string;
                iterations: Array<{
                  id: string;
                  number: number;
                  status: string;
                  enhancedPrompt?: string;
                  videoUrl?: string;
                  analysisResult?: { answer: "yes" | "no"; explanation: string };
                }>;
                referenceImages?: Array<{
                  id: string;
                  url: string;
                  filename: string;
                }>;
              }) => ({
                id: job.id,
                userPrompt: job.userPrompt,
                displayName: job.displayName,
                status: job.status,
                currentStage: job.currentStage,
                finalVideoUrl: job.finalVideoUrl,
                iterations: job.iterations || [],
                referenceImages: job.referenceImages || [],
                saved: true,
              }));
            setSavedJobs(jobs);
          }
        }
      } catch (err) {
        console.error("Failed to load saved jobs:", err);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    if (projectId) {
      loadSavedJobs();
    }
  }, [projectId]);

  // Handle rename job - updates displayName, NOT userPrompt
  const handleRenameJob = async (jobId: string, newDisplayName: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newDisplayName }),
      });

      if (response.ok) {
        // Update displayName only - userPrompt stays as original
        setSavedJobs((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, displayName: newDisplayName } : job
          )
        );
        if (currentJob?.id === jobId) {
          setCurrentJob({ ...currentJob, displayName: newDisplayName });
        }
      }
    } catch (err) {
      console.error("Failed to rename job:", err);
    }
    setEditingJobId(null);
    setEditingPrompt("");
  };

  // Handle delete job - actual deletion
  const confirmDeleteJob = async () => {
    if (!deleteConfirmJobId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/jobs/${deleteConfirmJobId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedJobs((prev) => prev.filter((job) => job.id !== deleteConfirmJobId));
        if (currentJob?.id === deleteConfirmJobId) {
          setCurrentJob(null);
        }
      } else {
        setError("Failed to delete generation. Please try again.");
      }
    } catch (err) {
      console.error("Failed to delete job:", err);
      setError("Failed to delete generation. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmJobId(null);
      setActiveDropdown(null);
    }
  };
  
  // Handle delete job - show confirmation modal
  const handleDeleteJob = (jobId: string) => {
    setDeleteConfirmJobId(jobId);
    setActiveDropdown(null);
  };

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(
      (file) => file.size <= 10 * 1024 * 1024 && file.type.startsWith("image/")
    );

    if (validFiles.length + referenceImages.length > 3) {
      alert("Maximum 3 reference images allowed");
      return;
    }

    setReferenceImages([...referenceImages, ...validFiles].slice(0, 3));
  };

  const removeImage = (index: number) => {
    setReferenceImages(referenceImages.filter((_, i) => i !== index));
    setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index));
  };

  // Upload reference images to server
  const uploadImages = async (): Promise<string[]> => {
    if (referenceImages.length === 0) return [];

    const formData = new FormData();
    referenceImages.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload images");
    }

    const result = await response.json();
    return result.data.map((img: { url: string }) => img.url);
  };

  // Calculate progress based on job state
  const calculateProgress = useCallback((job: Job): number => {
    if (job.status === "COMPLETED") return 100;
    if (job.status === "FAILED") return 0;

    const iterationCount = job.iterations.length;
    const maxIterations = 5;

    const stageProgress: Record<string, number> = {
      enhancing_prompt: 10,
      generating_video: 50,
      analyzing_video: 80,
      refining_prompt: 90,
      completed: 100,
    };

    const currentStageProgress = stageProgress[job.currentStage || ""] || 0;
    const stageContribution = (currentStageProgress / 100) * (100 / maxIterations);

    return Math.min(95, (iterationCount / maxIterations) * 100 + stageContribution);
  }, []);

  // Start SSE connection to listen for job updates
  const startJobStatusListener = useCallback((jobId: string) => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/job-status/${jobId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          setIsGenerating(false);
          eventSource.close();
          return;
        }

        if (data.done) {
          setIsGenerating(false);
          setProgress(100);
          eventSource.close();
          return;
        }

        // Update job state
        const updatedJob: Job = {
          id: jobId,
          userPrompt: currentJob?.userPrompt || prompt,
          status: data.status,
          currentStage: data.currentStage,
          iterations: data.iterations || [],
          finalVideoUrl: data.finalVideoUrl,
          saved: false, // Not saved yet
        };

        setCurrentJob(updatedJob);
        setProgress(calculateProgress(updatedJob));

        // If completed or failed, close SSE
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          setIsGenerating(false);
          eventSource.close();
        }
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      setError("Connection lost. Please refresh the page.");
      setIsGenerating(false);
      eventSource.close();
    };
  }, [currentJob, prompt, calculateProgress]);

  // Save current generation to sidebar
  const handleSaveGeneration = async () => {
    if (!currentJob || currentJob.saved) return;

    setIsSaving(true);
    try {
      // Build reference images from current uploaded URLs if not already present
      const refImages: ReferenceImage[] = currentJob.referenceImages || 
        uploadedImageUrls.map((url, idx) => ({
          id: `temp-${idx}`,
          url,
          filename: referenceImages[idx]?.name || `image-${idx + 1}`,
        }));
      
      // Mark as saved and add to sidebar with reference images
      const savedJob: Job = { 
        ...currentJob, 
        saved: true,
        referenceImages: refImages,
      };
      setCurrentJob(savedJob);
      setSavedJobs((prev) => {
        // Avoid duplicates
        const filtered = prev.filter((j) => j.id !== savedJob.id);
        return [savedJob, ...filtered];
      });
    } catch (err) {
      console.error("Failed to save generation:", err);
      alert("Failed to save generation");
    } finally {
      setIsSaving(false);
    }
  };

  // Start new generation (clear current and show blank form)
  const handleNewGeneration = () => {
    setCurrentJob(null);
    setPrompt("");
    setReferenceImages([]);
    setUploadedImageUrls([]);
    setProgress(0);
    setError(null);
  };

  // Handle video generation - REAL API CALL
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Upload reference images if any
      let imageUrls: string[] = [];
      if (referenceImages.length > 0) {
        setProgress(5);
        imageUrls = await uploadImages();
        setUploadedImageUrls(imageUrls);
      }

      setProgress(10);

      // Step 2: Start the pipeline via API
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          userPrompt: prompt,
          referenceImages: imageUrls.map((url, i) => ({
            url,
            filename: referenceImages[i]?.name || `image-${i}.jpg`,
          })),
          settings: {
            aspectRatio,
            resolution,
            duration,
          },
          retentionDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start pipeline");
      }

      const result = await response.json();
      const jobId = result.data.jobId;

      // Initialize current job
      setCurrentJob({
        id: jobId,
        userPrompt: prompt,
        status: "PROCESSING",
        currentStage: "enhancing_prompt",
        iterations: [],
        saved: false,
      });

      setProgress(15);

      // Step 3: Start listening for job updates via SSE
      startJobStatusListener(jobId);

    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate video");
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 border-r border-white/10 bg-[#0d0d14] z-40 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-72" : "w-0"
        } overflow-hidden`}
      >
        <div className="w-72 h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-white/10 flex-shrink-0">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/celea-logo.png"
                alt="Celea"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-xl font-semibold text-white">Celea</span>
            </Link>
          </div>

          {/* Back to projects */}
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <Link
              href="/projects"
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Back to Projects
            </Link>
          </div>

          {/* New Generation Button */}
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <Button
              onClick={handleNewGeneration}
              className="w-full bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white"
              disabled={isGenerating}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Generation
            </Button>
          </div>

          {/* Saved Generations */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 pb-2 flex-shrink-0">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Saved Generations
              </h3>
            </div>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-2">
                {isLoadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <SpinnerIcon className="w-6 h-6 animate-spin text-white/40" />
                  </div>
                ) : (
                  <>
                    {savedJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`group relative p-3 rounded-lg border cursor-pointer transition-colors ${
                          currentJob?.id === job.id
                            ? "bg-white/10 border-[rgb(238,133,125)]/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                        onClick={() => {
                          if (editingJobId !== job.id) {
                            setCurrentJob(job);
                            // Populate form fields with saved job data
                            setPrompt(job.userPrompt);
                            // Set reference image URLs from the saved job
                            const savedImageUrls = job.referenceImages?.map(img => img.url) || [];
                            setUploadedImageUrls(savedImageUrls);
                            // Clear file references since we're loading from URLs
                            setReferenceImages([]);
                          }
                        }}
                      >
                        {/* Edit mode */}
                        {editingJobId === job.id ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingPrompt}
                              onChange={(e) => setEditingPrompt(e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleRenameJob(job.id, editingPrompt);
                                } else if (e.key === "Escape") {
                                  setEditingJobId(null);
                                  setEditingPrompt("");
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRenameJob(job.id, editingPrompt)}
                                className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingJobId(null);
                                  setEditingPrompt("");
                                }}
                                className="px-2 py-1 text-xs bg-white/10 text-white/60 rounded hover:bg-white/20"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Three dots menu */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === job.id ? null : job.id);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-white/40 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white transition-all"
                            >
                              <MoreIcon className="w-4 h-4" />
                            </button>

                            {/* Dropdown menu */}
                            {activeDropdown === job.id && (
                              <div
                                className="absolute top-8 right-2 z-50 bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setEditingJobId(job.id);
                                    // Start with displayName if set, otherwise use userPrompt
                                    setEditingPrompt(job.displayName || job.userPrompt);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                >
                                  <EditIcon className="w-4 h-4" />
                                  Rename
                                </button>
                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}

                            {/* Show displayName if set, otherwise show userPrompt */}
                            <p className="text-sm text-white line-clamp-2 pr-6">
                              {job.displayName || job.userPrompt}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="secondary"
                                className="bg-green-500/20 text-green-400 border-green-500/30"
                              >
                                completed
                              </Badge>
                              <span className="text-xs text-white/40">
                                {job.iterations.length} iterations
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {savedJobs.length === 0 && (
                      <p className="text-sm text-white/30 text-center py-8">
                        No saved generations yet
                      </p>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 w-6 h-14 bg-[#1a1f2e] border border-white/10 rounded-r-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-[#252a3a] transition-all duration-300 ${
          sidebarOpen ? "left-72" : "left-0"
        }`}
        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      >
        <ChevronLeftIcon
          className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? "" : "rotate-180"}`}
        />
      </button>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? "pl-72" : "pl-0"
        }`}
      >
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Video</h1>
            <p className="text-white/50">
              Describe your vision and let AI generate cinematic videos
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Input Form */}
            <div className="space-y-6">
              {/* Prompt Input */}
              <Card className="bg-white/[0.03] border-white/10">
                <CardContent className="p-6">
                  <label className="block text-sm font-medium text-white mb-3">
                    Describe your video
                  </label>
                  <Textarea
                    placeholder="A lone astronaut walking on Mars during sunset, with dust particles floating in the air..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                    disabled={isGenerating}
                  />
                </CardContent>
              </Card>

              {/* Reference Images */}
              <Card className="bg-white/[0.03] border-white/10">
                <CardContent className="p-6">
                  <label className="block text-sm font-medium text-white mb-3">
                    Reference Images{" "}
                    <span className="text-white/40">(optional, max 3)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isGenerating}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    {/* Show newly uploaded images (File objects) */}
                    {referenceImages.map((file, index) => (
                      <div
                        key={`file-${index}`}
                        className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10"
                      >
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Reference ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          disabled={isGenerating}
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {/* Show saved images from URLs (when viewing saved generation) */}
                    {referenceImages.length === 0 && uploadedImageUrls.map((url, index) => (
                      <div
                        key={`url-${index}`}
                        className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10"
                      >
                        <Image
                          src={url}
                          alt={`Reference ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {/* Only show remove button when not in a saved generation view */}
                        {!currentJob?.saved && (
                          <button
                            onClick={() => {
                              setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            disabled={isGenerating}
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Show add button if less than 3 images total */}
                    {(referenceImages.length + (referenceImages.length === 0 ? uploadedImageUrls.length : 0)) < 3 && !currentJob?.saved && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/60 hover:border-white/20 transition-colors"
                        disabled={isGenerating}
                      >
                        <PlusIcon className="w-6 h-6" />
                        <span className="text-xs">Add Image</span>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Accordion type="single" collapsible>
                <AccordionItem
                  value="settings"
                  className="bg-white/[0.03] border-white/10 rounded-lg px-6"
                >
                  <AccordionTrigger className="text-white hover:no-underline">
                    <span className="text-sm font-medium">Advanced Settings</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="space-y-4">
                      {/* Aspect Ratio */}
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          Aspect Ratio
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setAspectRatio("16:9")}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              aspectRatio === "16:9"
                                ? "bg-[rgb(238,133,125)] text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                            disabled={isGenerating}
                          >
                            16:9 Landscape
                          </button>
                          <button
                            onClick={() => setAspectRatio("9:16")}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              aspectRatio === "9:16"
                                ? "bg-[rgb(238,133,125)] text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                            disabled={isGenerating}
                          >
                            9:16 Portrait
                          </button>
                        </div>
                      </div>

                      {/* Resolution */}
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          Resolution
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setResolution("720p")}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              resolution === "720p"
                                ? "bg-[rgb(238,133,125)] text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                            disabled={isGenerating}
                          >
                            720p
                          </button>
                          <button
                            onClick={() => {
                              setResolution("1080p");
                              setDuration(8); // 1080p requires 8s
                            }}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              resolution === "1080p"
                                ? "bg-[rgb(238,133,125)] text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            }`}
                            disabled={isGenerating}
                          >
                            1080p
                          </button>
                        </div>
                        {resolution === "1080p" && (
                          <p className="text-xs text-[rgb(248,214,134)] mt-2">
                            1080p resolution requires 8 seconds duration
                          </p>
                        )}
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          Duration
                        </label>
                        <div className="flex gap-3">
                          {([4, 6, 8] as const).map((d) => (
                            <button
                              key={d}
                              onClick={() => setDuration(d)}
                              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                duration === d
                                  ? "bg-[rgb(238,133,125)] text-white"
                                  : "bg-white/5 text-white/60 hover:bg-white/10"
                              } ${
                                resolution === "1080p" && d !== 8
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={isGenerating || (resolution === "1080p" && d !== 8)}
                            >
                              {d}s
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Retention */}
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          Video Retention
                        </label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={-1}
                            max={365}
                            value={retentionDays}
                            onChange={(e) =>
                              setRetentionDays(parseInt(e.target.value) || 30)
                            }
                            className="w-20 bg-white/5 border-white/10 text-white"
                            disabled={isGenerating}
                          />
                          <span className="text-sm text-white/40">
                            days (-1 for permanent)
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white py-6 text-lg rounded-xl shadow-lg shadow-[rgb(238,133,125)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Generate Video"
                )}
              </Button>
            </div>

            {/* Right Column - Progress & Results */}
            <div>
              {/* Progress Panel */}
              {(isGenerating || currentJob) && (
                <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl">
                  <CardContent className="p-6">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        {isGenerating ? "Generating Video" : "Generation Complete"}
                      </h3>
                      {currentJob?.status === "COMPLETED" && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {currentJob?.status === "FAILED" && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          Failed
                        </Badge>
                      )}
                    </div>

                    {/* Current Stage */}
                    {isGenerating && currentJob?.currentStage && (
                      <div className="mb-4 text-sm text-white/60">
                        {getStageMessage(currentJob.currentStage, Math.max(1, currentJob.iterations.length))}
                      </div>
                    )}

                    {/* Progress Bar */}
                    {isGenerating && (
                      <div className="mb-6">
                        <div className="flex justify-between text-sm text-white/60 mb-2">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-white/10" />
                      </div>
                    )}

                    {/* Iterations */}
                    <div className="space-y-4">
                      {currentJob?.iterations.map((iteration) => (
                        <IterationCard key={iteration.id} iteration={iteration} />
                      ))}
                    </div>

                    {/* Final Video */}
                    {currentJob?.finalVideoUrl && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <h4 className="text-sm font-medium text-white mb-3">
                          Final Video
                        </h4>
                        <div className="aspect-video bg-black rounded-lg relative overflow-hidden">
                          <video
                            src={currentJob.finalVideoUrl}
                            controls
                            className="w-full h-full"
                          />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4">
                          {/* Download Button */}
                          <a
                            href={currentJob.finalVideoUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button className="w-full bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white">
                              <DownloadIcon className="w-4 h-4 mr-2" />
                              Download Video
                            </Button>
                          </a>
                          
                          {/* Save Generation Button - Only show if not saved */}
                          {!currentJob.saved && (
                            <Button
                              onClick={handleSaveGeneration}
                              disabled={isSaving}
                              className="flex-1 bg-[rgb(124,199,212)] hover:bg-[rgb(104,179,192)] text-white"
                            >
                              {isSaving ? (
                                <span className="flex items-center gap-2">
                                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                                  Saving...
                                </span>
                              ) : (
                                <>
                                  <SaveIcon className="w-4 h-4 mr-2" />
                                  Save Generation
                                </>
                              )}
                            </Button>
                          )}
                          
                          {/* Saved indicator */}
                          {currentJob.saved && (
                            <div className="flex-1 flex items-center justify-center gap-2 text-green-400 text-sm bg-green-500/10 rounded-lg py-2">
                              <CheckIcon className="w-4 h-4" />
                              Saved Generation
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!isGenerating && !currentJob && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                      <VideoIcon className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">
                      Ready to create
                    </h3>
                    <p className="text-sm text-white/40 max-w-xs mx-auto">
                      Enter a prompt describing your video and click Generate to
                      start the AI pipeline.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmJobId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteConfirmJobId(null)}
          />
          {/* Modal */}
          <div className="relative bg-[#1a1f2e] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Generation?
            </h3>
            <p className="text-sm text-white/60 mb-6">
              This will permanently delete this generation including all associated videos and images from storage. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirmJobId(null)}
                disabled={isDeleting}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteJob}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for stage messages
function getStageMessage(stage: string, iteration: number): string {
  switch (stage) {
    case "enhancing_prompt":
    case "generating_video":
      return `Generating iteration ${iteration}...`;
    case "analyzing_video":
      return `Analyzing generation ${iteration}...`;
    case "refining_prompt":
      return `Preparing iteration ${iteration + 1}...`;
    case "completed":
      return "Generation complete!";
    default:
      return `Processing...`;
  }
}

function IterationCard({ iteration }: { iteration: Iteration }) {
  const getStatusColor = () => {
    switch (iteration.status) {
      case "COMPLETED":
        return iteration.analysisResult?.answer === "yes"
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getStatusLabel = () => {
    switch (iteration.status) {
      case "ENHANCING":
      case "GENERATING":
        return "Generating...";
      case "ANALYZING":
        return "Analyzing...";
      case "COMPLETED":
        return iteration.analysisResult?.answer === "yes" ? "Approved" : "Needs refinement";
      case "FAILED":
        return "Failed";
      default:
        return iteration.status;
    }
  };

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white">
          Iteration {iteration.number}
        </span>
        <Badge className={getStatusColor()}>{getStatusLabel()}</Badge>
      </div>

      {/* Video Preview */}
      {iteration.videoUrl && (
        <div className="aspect-video bg-black/50 rounded-lg mb-3 relative overflow-hidden">
          <video
            src={iteration.videoUrl}
            controls
            className="w-full h-full"
          />
        </div>
      )}

      {/* Analysis */}
      {iteration.analysisResult && (
        <Accordion type="single" collapsible>
          <AccordionItem value="analysis" className="border-0">
            <AccordionTrigger className="text-sm text-white/60 hover:no-underline py-2">
              View Analysis
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-white/50">{iteration.analysisResult.explanation}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

// Icons
function ChevronLeftIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SaveIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

function MoreIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}

function EditIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
