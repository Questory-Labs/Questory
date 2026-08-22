import { LandingController } from "@/modules/auth/landing/auth.landing.controller";
import { LandingView } from "@/modules/auth/landing/auth.landing.view";

const LandingPage = () => (
  <LandingController>
    <LandingView />
  </LandingController>
);

export default LandingPage;
