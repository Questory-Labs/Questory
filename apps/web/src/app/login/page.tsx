import { Suspense } from "react";
import { LandingBackground } from "@/components/LandingBackground";
import { LoginController } from "@/modules/auth/login/auth.login.controller";
import { LoginView } from "@/modules/auth/login/auth.login.view";

const LoginPage = () => (
  <div className="relative min-h-screen overflow-hidden">
    <LandingBackground />
    <Suspense fallback={null}>
      <LoginController>
        <LoginView />
      </LoginController>
    </Suspense>
  </div>
);
export default LoginPage;
