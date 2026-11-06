export type LandingViewProps = {
  showRegister: boolean;
  showDemo?: boolean;
  demoPending?: boolean;
  demoError?: string | null;
  startDemo?: () => void;
};
