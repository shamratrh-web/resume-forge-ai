import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Download, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-slate-900">ResumeForge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">World-class resume builder</span>
          </div>
          
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Create professional resumes in minutes
          </h1>
          
          <p className="text-xl text-slate-600 mb-8">
            Build stunning resumes with our drag-and-drop editor. 
            Customize every detail and export to PDF with perfect formatting.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-lg">
                Create Resume Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/editor/new">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                Try Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Drag & Drop Editor</h3>
            <p className="text-slate-600">
              Easily rearrange sections and items with our intuitive drag-and-drop interface.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">PDF Export</h3>
            <p className="text-slate-600">
              Export your resume to PDF with pixel-perfect formatting that looks exactly as it does on screen.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Custom Design</h3>
            <p className="text-slate-600">
              Personalize fonts, colors, spacing, and layout to create a unique resume that stands out.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Ready to build your resume?</h2>
          <p className="text-slate-600 mb-6">
            Join thousands of job seekers who trust ResumeForge for their career success.
          </p>
          <Link href="/register">
            <Button size="lg" className="h-12 px-8">
              Get Started Free
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500">
          <p>© 2024 ResumeForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
