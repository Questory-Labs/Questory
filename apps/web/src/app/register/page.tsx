import { RegisterController } from "@/modules/auth/register/auth.register.controller";
import { RegisterView } from "@/modules/auth/register/auth.register.view";

const RegisterPage = () => (
  <RegisterController>
    <RegisterView />
  </RegisterController>
);

export default RegisterPage;
