import { FriendCompareController } from "@/modules/steam/friend-compare/steam.friend-compare.controller";
import { FriendCompareView } from "@/modules/steam/friend-compare/steam.friend-compare.view";

const FriendComparePage = () => (
  <FriendCompareController>
    <FriendCompareView />
  </FriendCompareController>
);

export default FriendComparePage;
