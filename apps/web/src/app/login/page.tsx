import { Suspense } from "react";
import { AuthMorphAside } from "@/components/auth/AuthMorphAside";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginController } from "@/modules/auth/login/auth.login.controller";
import { LoginView } from "@/modules/auth/login/auth.login.view";

const LoginPage = () => (
  <AuthSplitLayout aside={<AuthMorphAside />}>
    <Suspense fallback={null}>
      <LoginController>
        <LoginView />
      </LoginController>
    </Suspense>
  </AuthSplitLayout>
);
export default LoginPage;
