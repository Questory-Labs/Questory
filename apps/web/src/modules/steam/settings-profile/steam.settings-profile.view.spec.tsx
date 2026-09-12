import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { MeResponse, ProfileExportStatus, ProfileImportJob, User } from "@questorylabs/shared";
import { ProfileSettingsView } from "./steam.settings-profile.view";
import type {
  PriceRegion,
  ProfileSettingsViewProps,
} from "./steam.settings-profile.types";

vi.mock("@/components/ApiKeyPanel", () => ({
  ApiKeyPanel: () => null,
}));

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const idleSave = {
  submit: vi.fn(),
  submitAsync: vi.fn(),
  reset: vi.fn(),
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as unknown as UseActionResult<MeResponse, string>;

const idleVoid = {
  ...idleSave,
} as unknown as UseActionResult<void, void>;

const idleExport = {
  ...idleSave,
} as unknown as UseActionResult<ProfileExportStatus, void>;

const idleImport = {
  ...idleSave,
} as unknown as UseActionResult<ProfileImportJob, File>;

const noneExport: ProfileExportStatus = {
  status: "none",
  inProgress: false,
  downloadReady: false,
  fileName: null,
  byteSize: null,
  expiresAt: null,
  lastError: null,
  createdAt: null,
  completedAt: null,
};

const regions: PriceRegion[] = [
  { countryCode: "IN", currency: "INR", label: "India (INR)" },
  { countryCode: "US", currency: "USD", label: "United States (USD)" },
];

const user: User = {
  id: "u1",
  steamId: "765",
  personaName: "Sam",
  avatarUrl: null,
  profileUrl: null,
  countryCode: "IN",
};

const renderView = (patch: Partial<ProfileSettingsViewProps>) =>
  render(
    <ProfileSettingsView
      {...({
        regions: resource<PriceRegion[]>({
          empty: false,
          failed: false,
          value: regions,
        }),
        countryCode: "IN",
        onCountryChange: () => undefined,
        save: idleSave,
        message: null,
        error: null,
        selected: regions[0],
        dirty: false,
        user,
        showMusic: false,
        showWatch: false,
        exportStatus: resource<ProfileExportStatus>({
          empty: false,
          failed: false,
          value: noneExport,
        }),
        generateExport: idleExport,
        downloadExport: idleVoid,
        importJob: resource<ProfileImportJob | null>({
          empty: false,
          failed: false,
          value: null,
        }),
        importFile: null,
        importConfirmOpen: false,
        onPickImportFile: () => undefined,
        onOpenImportConfirm: () => undefined,
        onCloseImportConfirm: () => undefined,
        runImport: idleImport,
        ...patch,
      } as ProfileSettingsViewProps)}
    />,
  );

describe("ProfileSettingsView", () => {
  afterEach(cleanup);

  it("shows skeletons when regions are empty", () => {
    renderView({
      regions: resource<PriceRegion[]>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Country / currency")).not.toBeInTheDocument();
  });

  it("shows an error when regions failed, even if empty", () => {
    renderView({
      regions: resource<PriceRegion[]>({ empty: true, failed: true }),
    });
    expect(
      screen.getByText("Could not load price regions."),
    ).toBeInTheDocument();
  });

  it("renders the region picker when ready", () => {
    renderView({});
    expect(screen.getByText("Country / currency")).toBeInTheDocument();
    expect(screen.getByText("Prices will use INR")).toBeInTheDocument();
  });
});
