import { CollectionDetailController } from "@/modules/steam/collection-detail/steam.collection-detail.controller";
import { CollectionDetailView } from "@/modules/steam/collection-detail/steam.collection-detail.view";

const CollectionDetailPage = () => (
  <CollectionDetailController>
    <CollectionDetailView />
  </CollectionDetailController>
);

export default CollectionDetailPage;
