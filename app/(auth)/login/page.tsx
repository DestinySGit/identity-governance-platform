"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      const { message: errMsg } = result.error;
      const msg = errMsg.toLowerCase();

      if (msg.includes("rate limit")) {
        setError(
          "Supabase email rate limit reached. Wait about an hour, create a user in the Supabase dashboard (Authentication → Users), or disable Confirm email under Authentication → Providers → Email."
        );
      } else if (
        isSignUp &&
        (msg.includes("unable to validate email") ||
          msg.includes("email address is invalid") ||
          msg.includes("is not a valid email"))
      ) {
        setError(
          "Supabase rejected that email format. Try a different address or create the user in the Supabase dashboard."
        );
      } else if (!isSignUp && msg.includes("invalid login credentials")) {
        setError(
          "Sign in failed. Check your password, or use Sign up if you have not created an account yet. You can also add the user under Supabase → Authentication → Users."
        );
      } else {
        setError(errMsg);
      }
      setLoading(false);
      return;
    }

    if (isSignUp && !result.data.session) {
      setMessage(
        "Account created. Check your email for a confirmation link, then sign in. For local dev, you can turn off Confirm email in Supabase → Authentication → Providers → Email."
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Identity_Governance_Platform</CardTitle>
          <CardDescription>
            {isSignUp ? "Create an account to get started" : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
            {message && (
              <p className="text-sm text-green-700">{message}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            First user receives admin role automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
