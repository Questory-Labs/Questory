import { Suspense } from "react";
import { SearchController } from "@/modules/steam/search/steam.search.controller";
import { SearchView } from "@/modules/steam/search/steam.search.view";

const SearchPage = () => (
  <Suspense>
    <SearchController>
      <SearchView />
    </SearchController>
  </Suspense>
);

export default SearchPage;
