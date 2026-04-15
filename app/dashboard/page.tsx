import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Trash2, Copy } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: resumes } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">ResumeForge</h1>
          <div className="flex items-center gap-4">
            <Link href="/editor/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Resume
              </Button>
            </Link>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {resumes && resumes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/editor/${resume.id}`}
                className="block group"
              >
                <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden">
                  <div className="aspect-[1/1.4] bg-slate-100 relative">
                    {resume.thumbnail_url ? (
                      <img
                        src={resume.thumbnail_url}
                        alt={resume.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-16 w-16 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {resume.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Updated {new Date(resume.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="h-20 w-20 text-slate-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              No resumes yet
            </h2>
            <p className="text-slate-500 mb-6">
              Create your first resume to get started
            </p>
            <Link href="/editor/new">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Resume
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
