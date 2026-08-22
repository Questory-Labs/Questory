import { FriendsController } from "@/modules/steam/friends/steam.friends.controller";
import { FriendsView } from "@/modules/steam/friends/steam.friends.view";

const FriendsPage = () => (
  <FriendsController>
    <FriendsView />
  </FriendsController>
);

export default FriendsPage;
