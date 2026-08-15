"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";

// GitHub icon as inline SVG (lucide-react v1.x does not export brand icons)
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// Google icon as inline SVG (lucide-react doesn't include brand icons)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-16 flex items-center px-8 bg-white border-b border-slate-200">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 text-center mb-8">
              Sign in to your Bystander workspace
            </p>

            {/* Error alert */}
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error === "OAuthAccountNotLinked"
                  ? "This email is already linked to a different provider."
                  : "Sign-in failed. Please try again."}
              </div>
            )}

            {/* OAuth buttons */}
            <div className="space-y-3">
              <button
                id="btn-signin-github"
                onClick={() => signIn("github", { callbackUrl })}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                <GitHubIcon />
                Continue with GitHub
              </button>

              <button
                id="btn-signin-google"
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-semibold text-sm border border-slate-200 transition-colors"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs text-slate-400 bg-white px-3">
                <span className="bg-white px-2">Secure OAuth — no password stored</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center leading-relaxed">
              By signing in you agree to our{" "}
              <Link href="#" className="underline hover:text-slate-600">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="#" className="underline hover:text-slate-600">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="text-center mt-6 text-sm text-slate-500">
            Need an account?{" "}
            <Link
              href="/onboarding"
              className="font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
