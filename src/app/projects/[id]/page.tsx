"use client";

import { useState, useRef } from "react";
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
  status: "enhancing" | "generating" | "analyzing" | "completed" | "failed";
  enhancedPrompt?: string;
  videoUrl?: string;
  analysis?: {
    answer: "yes" | "no";
    explanation: string;
  };
}

interface Job {
  id: string;
  userPrompt: string;
  status: "pending" | "processing" | "completed" | "failed";
  currentStage?: string;
  iterations: Iteration[];
  finalVideoUrl?: string;
}

export default function ProjectDetailPage() {
  // Form state
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("1080p");
  const [duration, setDuration] = useState<4 | 6 | 8>(8);
  const [retentionDays, setRetentionDays] = useState<number>(30);

  // Pipeline state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  // Handle video generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);

    // Create a new job
    const newJob: Job = {
      id: String(Date.now()),
      userPrompt: prompt,
      status: "processing",
      currentStage: "enhancing_prompt",
      iterations: [],
    };

    setCurrentJob(newJob);

    // Simulate pipeline progress (replace with actual API calls)
    await simulatePipeline(newJob);
  };

  // Simulated pipeline (replace with actual API implementation)
  const simulatePipeline = async (job: Job) => {
    const maxIterations = 3; // Simulating 3 iterations for demo

    for (let i = 1; i <= maxIterations; i++) {
      const iteration: Iteration = {
        id: `${job.id}-${i}`,
        number: i,
        status: "enhancing",
      };

      // Update job with new iteration
      job.iterations.push(iteration);
      setCurrentJob({ ...job });

      // Simulate enhancement
      setProgress((i - 1) * 33 + 10);
      await delay(1500);
      iteration.status = "generating";
      iteration.enhancedPrompt = `Enhanced cinematic prompt for iteration ${i}...`;
      setCurrentJob({ ...job });

      // Simulate video generation
      setProgress((i - 1) * 33 + 20);
      await delay(2000);
      iteration.status = "analyzing";
      iteration.videoUrl = `/placeholder-video-${i}.mp4`;
      setCurrentJob({ ...job });

      // Simulate analysis
      setProgress((i - 1) * 33 + 30);
      await delay(1000);

      if (i === maxIterations) {
        // Final iteration passes
        iteration.status = "completed";
        iteration.analysis = {
          answer: "yes",
          explanation:
            "Video matches the user goal perfectly. Subject, setting, and cinematic quality all align with requirements.",
        };
        job.status = "completed";
        job.finalVideoUrl = iteration.videoUrl;
      } else {
        // Previous iterations fail
        iteration.status = "completed";
        iteration.analysis = {
          answer: "no",
          explanation: `Iteration ${i}: Minor adjustments needed in lighting and composition. Refining prompt for next iteration.`,
        };
      }

      setCurrentJob({ ...job });
    }

    setProgress(100);
    setJobs([job, ...jobs]);
    setIsGenerating(false);
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/10 bg-[#0d0d14] z-40">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
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
        <div className="p-4 border-b border-white/10">
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>

        {/* Previous Jobs */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Previous Videos
          </h3>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <p className="text-sm text-white truncate">{job.userPrompt}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={job.status === "completed" ? "default" : "secondary"}
                      className={
                        job.status === "completed"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : ""
                      }
                    >
                      {job.status}
                    </Badge>
                    <span className="text-xs text-white/40">
                      {job.iterations.length} iterations
                    </span>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">
                  No videos generated yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Video</h1>
            <p className="text-white/50">
              Describe your vision and let AI generate cinematic videos
            </p>
          </div>

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
                    {referenceImages.map((file, index) => (
                      <div
                        key={index}
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
                    {referenceImages.length < 3 && (
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
                      {currentJob?.status === "completed" && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </div>

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
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[rgb(238,133,125)]/20 to-[rgb(193,202,241)]/20">
                            <PlayIcon className="w-16 h-16 text-white/80" />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full mt-4 border-white/10 text-white hover:bg-white/5"
                        >
                          <DownloadIcon className="w-4 h-4 mr-2" />
                          Download Video
                        </Button>
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
    </div>
  );
}

function IterationCard({ iteration }: { iteration: Iteration }) {
  const getStatusColor = () => {
    switch (iteration.status) {
      case "completed":
        return iteration.analysis?.answer === "yes"
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getStatusLabel = () => {
    switch (iteration.status) {
      case "enhancing":
        return "Enhancing prompt...";
      case "generating":
        return "Generating video...";
      case "analyzing":
        return "Analyzing quality...";
      case "completed":
        return iteration.analysis?.answer === "yes" ? "Approved" : "Needs refinement";
      case "failed":
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
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayIcon className="w-8 h-8 text-white/60" />
          </div>
        </div>
      )}

      {/* Analysis */}
      {iteration.analysis && (
        <Accordion type="single" collapsible>
          <AccordionItem value="analysis" className="border-0">
            <AccordionTrigger className="text-sm text-white/60 hover:no-underline py-2">
              View Analysis
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-white/50">{iteration.analysis.explanation}</p>
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
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function PlusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function PlayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function SpinnerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function DownloadIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

