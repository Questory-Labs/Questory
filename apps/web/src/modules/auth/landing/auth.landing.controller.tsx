"use client";

import { useUser } from "@/hooks/useUser";
import { fetchSignupStatus } from "@/lib/auth-api";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";

export const LandingController = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const signup = useResource({
    id: ["signup-status"],
    load: fetchSignupStatus,
    retries: false,
  });

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    return () => document.documentElement.classList.remove("landing-active");
  }, []);

  return cloneElements(children, {
    showRegister: signup.value?.open !== false,
  });
};
