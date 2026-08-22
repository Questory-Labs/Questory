import { CollectionsController } from "@/modules/steam/collections/steam.collections.controller";
import { CollectionsView } from "@/modules/steam/collections/steam.collections.view";

const CollectionsPage = () => (
  <CollectionsController>
    <CollectionsView />
  </CollectionsController>
);

export default CollectionsPage;
