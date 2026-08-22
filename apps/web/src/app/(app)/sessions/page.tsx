import { SessionsController } from "@/modules/steam/sessions/steam.sessions.controller";
import { SessionsView } from "@/modules/steam/sessions/steam.sessions.view";

const SessionsPage = () => (
  <SessionsController>
    <SessionsView />
  </SessionsController>
);

export default SessionsPage;
