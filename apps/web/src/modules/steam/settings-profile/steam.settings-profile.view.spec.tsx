import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { MeResponse, ProfileExportStatus, ProfileImportJob, User } from "@questorylabs/shared";
import { ProfileSettingsView } from "./steam.settings-profile.view";
import type {
  ApiKeyIdentity,
  PriceRegion,
  ProfileApiKeys,
  ProfileChangePassword,
  ProfileDeleteAccount,
  ProfileRecap,
  ProfileSettingsViewProps,
  RecapSettings,
} from "./steam.settings-profile.types";

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

const identity: ApiKeyIdentity = {
  steamId: null,
  listenbrainzUsername: "sam",
  keys: [
    {
      id: "k1",
      type: "music_ingest",
      tokenPrefix: "qm_ab",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUsedAt: null,
    },
  ],
};

const apiKeys = (patch: Partial<ProfileApiKeys> = {}): ProfileApiKeys => ({
  identity: resource<ApiKeyIdentity>({ empty: false, failed: false, value: identity }),
  plainToken: null,
  create: { ...idleSave, submit: vi.fn() } as unknown as ProfileApiKeys["create"],
  revoke: { ...idleSave, submit: vi.fn() } as unknown as ProfileApiKeys["revoke"],
  copy: vi.fn(),
  copied: null,
  error: null,
  ...patch,
});

const recap = (patch: Partial<ProfileRecap> = {}): ProfileRecap => ({
  settings: resource<RecapSettings>({
    empty: false,
    failed: false,
    value: { monthly: false, global: false },
  }),
  save: { ...idleSave, submit: vi.fn() } as unknown as ProfileRecap["save"],
  error: null,
  ...patch,
});

const changePassword = (
  patch: Partial<ProfileChangePassword> = {},
): ProfileChangePassword => ({
  open: false,
  setOpen: vi.fn(),
  submit: vi.fn(),
  busy: false,
  error: null,
  done: false,
  ...patch,
});

const deleteAccount = (
  patch: Partial<ProfileDeleteAccount> = {},
): ProfileDeleteAccount => ({
  open: false,
  setOpen: vi.fn(),
  confirmText: "",
  setConfirmText: vi.fn(),
  submit: vi.fn(),
  busy: false,
  error: null,
  ...patch,
});

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
        apiKeys: apiKeys(),
        recap: recap(),
        changePassword: changePassword(),
        deleteAccount: deleteAccount(),
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

  it("renders the settings tabs with Profile current", () => {
    renderView({});
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Connections" })).toHaveAttribute(
      "href",
      "/settings/connections",
    );
  });

  it("shows email and member since, and change password only with a password", () => {
    const { unmount } = renderView({
      user: { ...user, email: "sam@example.com", createdAt: "2024-03-10T00:00:00.000Z" },
    });
    expect(screen.getByText(/sam@example.com · member since/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change password" })).toBeNull();
    unmount();
    const cp = changePassword();
    renderView({ user: { ...user, hasPassword: true }, changePassword: cp });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(cp.setOpen).toHaveBeenCalledWith(true);
  });

  it("submits the change password form and shows errors", () => {
    const cp = changePassword({ open: true, error: "Current password is incorrect." });
    renderView({ user: { ...user, hasPassword: true }, changePassword: cp });
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-password-1" } });
    fireEvent.submit(screen.getByLabelText("Current password").closest("form")!);
    expect(cp.submit).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password-1",
      confirmPassword: "new-password-1",
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Current password is incorrect.");
  });

  it("lists gated API keys with a masked prefix and confirms revoke", () => {
    const keys = apiKeys();
    renderView({ showMusic: true, showWatch: true, apiKeys: keys });
    expect(screen.getByText("qm_ab••••••••")).toBeInTheDocument();
    expect(screen.getByText("LZ_USER / username: sam")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate key" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Copy/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Revoke Music ingest (ListenBrainz) key" }));
    expect(keys.revoke.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revoke key" }));
    expect(keys.revoke.submit).toHaveBeenCalledWith("k1");
  });

  it("offers copy only for a freshly created token", () => {
    const keys = apiKeys({ plainToken: { type: "music_ingest", token: "qm_secret" } });
    renderView({ showMusic: true, apiKeys: keys });
    expect(screen.getByText("qm_secret")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy Music ingest (ListenBrainz) key" }));
    expect(keys.copy).toHaveBeenCalledWith("music_ingest");
  });

  it("hides the API keys section when no module is enabled", () => {
    renderView({});
    expect(screen.queryByText("API keys")).toBeNull();
  });

  it("toggles the monthly recap and locks it when enabled globally", () => {
    const r = recap();
    const { unmount } = renderView({ recap: r });
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Monthly recap" }));
    expect(r.save.submit).toHaveBeenCalledWith(true);
    unmount();
    renderView({
      recap: recap({
        settings: resource<RecapSettings>({
          empty: false,
          failed: false,
          value: { monthly: true, global: true },
        }),
      }),
    });
    expect(screen.getByRole("switch", { name: "Monthly recap" })).toBeDisabled();
    expect(screen.getByText("Enabled for everyone by your admin.")).toBeInTheDocument();
  });

  it("requires typing DELETE before deleting the account", () => {
    const d = deleteAccount({ open: true, confirmText: "DEL" });
    const { unmount } = renderView({ deleteAccount: d });
    expect(screen.getByRole("button", { name: "Delete account" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), { target: { value: "DELETE" } });
    expect(d.setConfirmText).toHaveBeenCalledWith("DELETE");
    unmount();
    const ready = deleteAccount({ open: true, confirmText: "DELETE" });
    renderView({ deleteAccount: ready });
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(ready.submit).toHaveBeenCalled();
  });
});
