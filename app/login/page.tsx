import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
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
            
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 text-center mb-8">Sign in to your Bystander workspace</p>
            
            <form className="space-y-4">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <Link href="#" className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  required
                />
              </div>
              
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </div>
          
          <div className="text-center mt-6 text-sm text-slate-500">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-accent hover:text-accent-hover transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
