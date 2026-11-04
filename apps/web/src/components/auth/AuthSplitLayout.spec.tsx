import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MORPH_PERIOD_SEC } from "@/components/dots/dot-painters";
import {
  AuthAlert,
  AuthField,
  AuthHeading,
  AuthSplitLayout,
  AuthStatusLine,
} from "./AuthSplitLayout";
import { AuthMorphAside } from "./AuthMorphAside";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AuthSplitLayout", () => {
  afterEach(cleanup);

  it("renders the brand, aside and main column", () => {
    render(
      <AuthSplitLayout aside={<p>Aside copy</p>}>
        <p>Form</p>
      </AuthSplitLayout>,
    );
    expect(screen.getByRole("link", { name: "Questory home" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Aside copy").closest("aside")).toHaveClass("panel");
    expect(screen.getByRole("main")).toHaveTextContent("Form");
  });

  it("accepts a custom brand", () => {
    render(
      <AuthSplitLayout aside={null} brand={<span>qMonitor</span>}>
        <p>Form</p>
      </AuthSplitLayout>,
    );
    expect(screen.queryByRole("link", { name: "Questory home" })).not.toBeInTheDocument();
    expect(screen.getByText("qMonitor")).toBeInTheDocument();
  });

  it("renders heading, field, alert and status primitives", () => {
    render(
      <>
        <AuthHeading eyebrow="Account" title="Sign" accent="in." sub="Welcome back." />
        <AuthField label="Email" name="email" invalid />
        <AuthAlert>Bad</AuthAlert>
        <AuthStatusLine tone="warn">Waiting</AuthStatusLine>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Sign in." })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveClass("field");
    expect(screen.getByRole("alert")).toHaveTextContent("Bad");
    expect(screen.getByText("Waiting")).toBeInTheDocument();
  });
});

describe("AuthMorphAside", () => {
  afterEach(cleanup);

  it("shows the headline, module pills and the instance host", async () => {
    render(<AuthMorphAside />);
    expect(screen.getByText("and read.")).toBeInTheDocument();
    const modules = screen.getByRole("list", { name: "Modules" });
    expect(modules.querySelectorAll("li")).toHaveLength(4);
    expect(screen.getByText("Games").closest("li")).toHaveAttribute("aria-current", "true");
    expect(
      await screen.findByText(
        window.location.host ? `Self-hosted at ${window.location.host}` : "Self-hosted",
      ),
    ).toBeInTheDocument();
  });

  it("moves the active pill on the canvas clock", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValueOnce({
      canvas: { width: 600, height: 384 },
      clearRect: vi.fn(),
      fillRect: vi.fn(),
    } as unknown as ReturnType<HTMLCanvasElement["getContext"]>);
    const start = performance.now();
    render(<AuthMorphAside />);

    const frameAt = (periods: number) =>
      act(() => frames.shift()?.(start + periods * MORPH_PERIOD_SEC * 1000));

    frameAt(0.7);
    expect(screen.getByText("Games").closest("li")).toHaveAttribute("aria-current", "true");
    frameAt(1.1);
    expect(screen.getByText("Music").closest("li")).toHaveAttribute("aria-current", "true");
    frameAt(10.1);
    expect(screen.getByText("Watch").closest("li")).toHaveAttribute("aria-current", "true");

    spy.mockRestore();
    vi.unstubAllGlobals();
  });
});
