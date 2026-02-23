import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock framer-motion to passthrough children without animation
vi.mock("framer-motion", () => {
  const Passthrough = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    // Filter out motion-specific props
    const htmlProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!["initial", "animate", "exit", "variants", "transition", "whileHover", "whileTap", "key"].includes(key)) {
        htmlProps[key] = value;
      }
    }
    return <div {...htmlProps}>{children}</div>;
  };

  return {
    motion: {
      div: Passthrough,
      span: Passthrough,
      p: Passthrough,
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useInView: () => true,
  };
});

// Mock auth storage
vi.mock("@/lib/auth-storage", () => ({
  hasStoredAccessToken: vi.fn(() => false),
  setStoredTokens: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  clearStoredTokens: vi.fn(),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
  },
}));

vi.mock("@/lib/api-client", () => ({
  getErrorMessage: vi.fn((e: unknown) => (e instanceof Error ? e.message : "error")),
}));

import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { hasStoredAccessToken } from "@/lib/auth-storage";
import { LoginClient } from "@/app/login/login-client";

describe("LoginClient", () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });
    vi.mocked(hasStoredAccessToken).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to /sourcing if user already has a token", () => {
    vi.mocked(hasStoredAccessToken).mockReturnValue(true);
    render(<LoginClient />);
    expect(mockReplace).toHaveBeenCalledWith("/sourcing");
  });

  it('renders "Welcome back" heading', () => {
    render(<LoginClient />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("completes login flow: email → password → submit", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      data: { access_token: "at", refresh_token: "rt", token_type: "bearer" },
      message: "ok",
    });

    render(<LoginClient />);

    // Enter email and proceed
    const emailInput = screen.getByPlaceholderText("Email");
    await user.type(emailInput, "test@example.com");
    const continueButton = screen.getByLabelText("Continue with email");
    await user.click(continueButton);

    // Enter password and submit
    const passwordInput = screen.getByPlaceholderText("Password");
    await user.type(passwordInput, "secret123");
    const signInButton = screen.getByLabelText("Sign in");
    await user.click(signInButton);

    expect(authApi.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "secret123",
    });
  });

  it("displays error message when login fails", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid credentials"));

    render(<LoginClient />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.click(screen.getByLabelText("Continue with email"));

    // Enter password and submit
    await user.type(screen.getByPlaceholderText("Password"), "wrong");
    await user.click(screen.getByLabelText("Sign in"));

    // Error modal should appear
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
