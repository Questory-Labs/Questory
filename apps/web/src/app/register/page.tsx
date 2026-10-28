import { AuthMorphAside } from "@/components/auth/AuthMorphAside";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { RegisterController } from "@/modules/auth/register/auth.register.controller";
import { RegisterView } from "@/modules/auth/register/auth.register.view";

const RegisterPage = () => (
  <AuthSplitLayout aside={<AuthMorphAside />}>
    <RegisterController>
      <RegisterView />
    </RegisterController>
  </AuthSplitLayout>
);

export default RegisterPage;
