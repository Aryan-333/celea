import { create } from "zustand";

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

interface Job {
  id: string;
  status: string;
  currentStage?: string;
  iterations: Iteration[];
  finalVideoUrl?: string;
}

interface PipelineState {
  // Current active job
  currentJobId: string | null;
  currentJob: Job | null;
  isGenerating: boolean;
  progress: number;
  error: string | null;

  // Event source for SSE
  eventSource: EventSource | null;

  // Actions
  startPipeline: (jobId: string) => void;
  updateJob: (job: Partial<Job>) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  stopListening: () => void;
  reset: () => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  currentJobId: null,
  currentJob: null,
  isGenerating: false,
  progress: 0,
  error: null,
  eventSource: null,

  startPipeline: (jobId: string) => {
    // Close existing connection if any
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
    }

    set({
      currentJobId: jobId,
      currentJob: {
        id: jobId,
        status: "PENDING",
        iterations: [],
      },
      isGenerating: true,
      progress: 0,
      error: null,
    });

    // Start SSE connection
    const newEventSource = new EventSource(`/api/job-status/${jobId}`, {
      withCredentials: true,
    });

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          set({ error: data.error, isGenerating: false });
          newEventSource.close();
          return;
        }

        if (data.done) {
          set({ isGenerating: false, progress: 100 });
          newEventSource.close();
          return;
        }

        // Update job state
        set((state) => ({
          currentJob: {
            ...state.currentJob,
            ...data,
            id: jobId,
          },
          progress: calculateProgress(data),
        }));
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    };

    newEventSource.onerror = () => {
      set({ error: "Connection lost. Please refresh.", isGenerating: false });
      newEventSource.close();
    };

    set({ eventSource: newEventSource });
  },

  updateJob: (jobUpdate: Partial<Job>) => {
    set((state) => ({
      currentJob: state.currentJob
        ? { ...state.currentJob, ...jobUpdate }
        : null,
    }));
  },

  setProgress: (progress: number) => {
    set({ progress });
  },

  setError: (error: string | null) => {
    set({ error, isGenerating: error ? false : get().isGenerating });
  },

  stopListening: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
    }
    set({ eventSource: null });
  },

  reset: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
    }
    set({
      currentJobId: null,
      currentJob: null,
      isGenerating: false,
      progress: 0,
      error: null,
      eventSource: null,
    });
  },
}));

// Calculate progress based on job state
function calculateProgress(data: {
  status: string;
  currentStage?: string;
  iterations?: Iteration[];
}): number {
  const { status, currentStage, iterations = [] } = data;

  if (status === "COMPLETED") return 100;
  if (status === "FAILED") return 0;

  const iterationCount = iterations.length;
  const maxIterations = 5;

  // Base progress on current iteration
  const iterationProgress = (iterationCount / maxIterations) * 100;

  // Add stage progress within current iteration
  const stageProgress: Record<string, number> = {
    enhancing_prompt: 10,
    generating_video: 50,
    analyzing_video: 80,
    refining_prompt: 90,
    completed: 100,
  };

  const currentStageProgress = stageProgress[currentStage || ""] || 0;
  const stageContribution = (currentStageProgress / 100) * (100 / maxIterations);

  return Math.min(95, iterationProgress + stageContribution);
}

