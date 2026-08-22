import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { FriendsListResponse } from "@questorylabs/shared";

export type FriendsViewProps = {
  friends: UseResourceResult<FriendsListResponse>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
};
