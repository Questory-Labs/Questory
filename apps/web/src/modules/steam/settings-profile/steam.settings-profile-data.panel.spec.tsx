import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  UseActionResult,
  UseResourceResult,
} from "@questorylabs/qhttp/react";
import type {
  ProfileExportStatus,
  ProfileImportJob,
} from "@questorylabs/shared";
import { ProfileDataPanel } from "./steam.settings-profile-data.panel";

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

const idleAction = {
  submit: vi.fn(),
  submitAsync: vi.fn(),
  reset: vi.fn(),
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
};

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

describe("ProfileDataPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("disables generate while an export is in progress", () => {
    render(
      <ProfileDataPanel
        exportStatus={resource<ProfileExportStatus>({
          empty: false,
          failed: false,
          value: { ...noneExport, status: "running", inProgress: true },
        })}
        generateExport={idleAction as unknown as UseActionResult<ProfileExportStatus, void>}
        downloadExport={idleAction as unknown as UseActionResult<void, void>}
        importJob={resource<ProfileImportJob | null>({
          empty: false,
          failed: false,
          value: null,
        })}
        importFile={null}
        importConfirmOpen={false}
        onPickImportFile={() => undefined}
        onOpenImportConfirm={() => undefined}
        onCloseImportConfirm={() => undefined}
        runImport={idleAction as unknown as UseActionResult<ProfileImportJob, File>}
      />,
    );
    expect(screen.getByRole("button", { name: "Preparing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download zip" })).toBeDisabled();
  });

  it("does not start import until the dialog is confirmed", () => {
    const runImport = {
      ...idleAction,
      submit: vi.fn(),
    };
    const file = new File(["zip"], "questory-profile.zip", {
      type: "application/zip",
    });
    render(
      <ProfileDataPanel
        exportStatus={resource<ProfileExportStatus>({
          empty: false,
          failed: false,
          value: noneExport,
        })}
        generateExport={idleAction as unknown as UseActionResult<ProfileExportStatus, void>}
        downloadExport={idleAction as unknown as UseActionResult<void, void>}
        importJob={resource<ProfileImportJob | null>({
          empty: false,
          failed: false,
          value: null,
        })}
        importFile={file}
        importConfirmOpen={false}
        onPickImportFile={() => undefined}
        onOpenImportConfirm={() => undefined}
        onCloseImportConfirm={() => undefined}
        runImport={runImport as unknown as UseActionResult<ProfileImportJob, File>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Import zip" }));
    expect(runImport.submit).not.toHaveBeenCalled();
  });

  it("shows import action errors in the confirmation dialog", () => {
    const file = new File(["zip"], "questory-profile.zip", {
      type: "application/zip",
    });
    render(
      <ProfileDataPanel
        exportStatus={resource<ProfileExportStatus>({
          empty: false,
          failed: false,
          value: noneExport,
        })}
        generateExport={idleAction as unknown as UseActionResult<ProfileExportStatus, void>}
        downloadExport={idleAction as unknown as UseActionResult<void, void>}
        importJob={resource<ProfileImportJob | null>({
          empty: false,
          failed: false,
          value: null,
        })}
        importFile={file}
        importConfirmOpen={true}
        onPickImportFile={() => undefined}
        onOpenImportConfirm={() => undefined}
        onCloseImportConfirm={() => undefined}
        runImport={
          {
            ...idleAction,
            failed: true,
            error: new Error("A profile import is already in progress"),
          } as unknown as UseActionResult<ProfileImportJob, File>
        }
      />,
    );
    expect(
      screen.getByText("A profile import is already in progress"),
    ).toBeInTheDocument();
  });
});
