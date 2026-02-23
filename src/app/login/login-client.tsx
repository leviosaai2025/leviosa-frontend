"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

import { AuthComponent } from "@/components/ui/sign-up";
import { authApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-client";
import { hasStoredAccessToken, setStoredTokens } from "@/lib/auth-storage";

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

  useEffect(() => {
    if (hasStoredAccessToken()) {
      router.replace("/sourcing");
    }
  }, [router]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      setStoredTokens(response.data);
      router.replace("/sourcing");
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  return (
    <AuthComponent
      logo={<Logo />}
      brandName=""
      onLogin={handleLogin}
    />
  );
}
