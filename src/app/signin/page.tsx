"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  async function signin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setError(error.message);
    else window.location.href = "/"; // go to app
  }

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) window.location.replace("/");
  });
}, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={signin} className="w-full max-w-sm space-y-3 border rounded-xl p-4">
        <div className="text-lg font-medium">Sign in</div>
        <Input placeholder="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input placeholder="password" type="password" value={pw} onChange={e => setPw(e.target.value)} required />
        {error && <div className="text-sm text-red-500">{error}</div>}
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
    </div>
  );
}
