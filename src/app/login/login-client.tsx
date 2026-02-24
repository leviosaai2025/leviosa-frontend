"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

import { AuthComponent } from "@/components/ui/sign-up";
import { createClient } from "@/lib/supabase/client";

const Logo = () => (
  <Image
    src="/leviosa-logo.png"
    alt="Leviosa AI"
    width={140}
    height={40}
    className="h-8 w-auto"
    priority
  />
);

export function LoginClient() {
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
    router.replace("/sourcing");
  };

  return (
    <AuthComponent
      logo={<Logo />}
      brandName=""
      onLogin={handleLogin}
    />
  );
}
