import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-16 flex items-center px-8 bg-white border-b border-slate-200">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2 tracking-tight">Create an account</h1>
            <p className="text-sm text-slate-500 text-center mb-8">Start resolving conflicts before they happen</p>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  required
                />
              </div>
              
              <div className="pt-2">
                <Link
                  href="/onboarding"
                  className="w-full flex items-center justify-center py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </div>
          
          <div className="text-center mt-6 text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
