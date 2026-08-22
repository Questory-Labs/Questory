import { WishlistController } from "@/modules/steam/wishlist/steam.wishlist.controller";
import { WishlistView } from "@/modules/steam/wishlist/steam.wishlist.view";

const WishlistPage = () => (
  <WishlistController>
    <WishlistView />
  </WishlistController>
);

export default WishlistPage;
