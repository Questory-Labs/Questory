import { FriendsController } from "@/modules/steam/friends/steam.friends.controller";
import { FriendsView } from "@/modules/steam/friends/steam.friends.view";

const FriendComparePage = () => (
  <FriendsController>
    <FriendsView />
  </FriendsController>
);

export default FriendComparePage;
