"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  jobCount?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/projects");
      const result = await response.json();

      if (result.success) {
        setProjects(result.data);
      } else {
        setError(result.error || "Failed to load projects");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error("Error fetching projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newProjectName }),
      });

      const result = await response.json();

      if (result.success) {
        setProjects([result.data, ...projects]);
        setNewProjectName("");
        setIsCreateDialogOpen(false);
      } else {
        setError(result.error || "Failed to create project");
      }
    } catch (err) {
      setError("Failed to create project");
      console.error("Error creating project:", err);
    } finally {
      setIsCreating(false);
    }
  };

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

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-1">
            <NavItem href="/projects" icon={<FolderIcon />} label="Projects" active />
            <NavItem href="#" icon={<SettingsIcon />} label="Settings" disabled />
          </div>
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[rgb(238,133,125)] to-[rgb(193,202,241)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">User</p>
              <p className="text-xs text-white/40">Free Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Projects</h1>
              <p className="text-sm text-white/50">
                Manage your video generation projects
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1f2e] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription className="text-white/50">
                    Give your project a name to get started with video generation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                    }}
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || isCreating}
                      className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white"
                    >
                      {isCreating ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Projects Grid */}
        <div className="p-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
              <Button
                onClick={() => {
                  setError(null);
                  fetchProjects();
                }}
                className="mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm"
              >
                Retry
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(238,133,125)]"></div>
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onCreateClick={() => setIsCreateDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
    active
      ? "bg-[rgb(238,133,125)]/10 text-[rgb(238,133,125)]"
      : disabled
      ? "text-white/30 cursor-not-allowed"
      : "text-white/60 hover:text-white hover:bg-white/5"
  }`;

  if (disabled) {
    return (
      <div className={className}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const jobCount = project.jobCount || 0;
  const createdAt = new Date(project.createdAt);

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer group">
        {/* Video Preview / Placeholder */}
        <div className="aspect-video bg-gradient-to-br from-[rgb(238,133,125)]/20 to-[rgb(193,202,241)]/20 rounded-t-lg relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <VideoIcon className="w-12 h-12 text-white/20 group-hover:text-white/30 transition-colors" />
          </div>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-lg">{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">
              {jobCount} saved {jobCount === 1 ? "generation" : "generations"}
            </span>
            <span className="text-white/40">{createdAt.toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <FolderIcon className="w-10 h-10 text-white/20" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
      <p className="text-white/50 mb-6 text-center max-w-md">
        Create your first project to start generating AI-powered cinematic videos.
      </p>
      <Button
        onClick={onCreateClick}
        className="bg-[rgb(238,133,125)] hover:bg-[rgb(228,113,105)] text-white"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Create Your First Project
      </Button>
    </div>
  );
}

// Icons
function FolderIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function SettingsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
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

function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}
