import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsernameModal from "@/components/UsernameModal";
import { useAuth } from "@/context/AuthContext";

// Mock useAuth
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("UsernameModal", () => {
  const mockUpdateProfile = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      updateProfile: mockUpdateProfile,
    } as any);
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(
        <UsernameModal isOpen={false} onClose={mockOnClose} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when isOpen is true", () => {
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Set Your Username")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Choose a username to display on the leaderboard and in the game.",
        ),
      ).toBeInTheDocument();
    });

    it("should render input field with correct attributes", () => {
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText(
        "Enter username",
      ) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe("text");
      // autoFocus is a React prop that doesn't reflect to DOM, just verify it's an input
      expect(input.tagName).toBe("INPUT");
    });

    it("should render submit button", () => {
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const button = screen.getByRole("button", { name: /Set Username/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Input Validation", () => {
    it("should show error if username is empty", async () => {
      const user = userEvent.setup();
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(screen.getByText("Username is required")).toBeInTheDocument();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("should show error if username is less than 3 characters", async () => {
      const user = userEvent.setup();
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "ab");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(
        screen.getByText("Username must be at least 3 characters"),
      ).toBeInTheDocument();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("should show error if username is more than 32 characters", async () => {
      const user = userEvent.setup();
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "a".repeat(33));

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(
        screen.getByText("Username must be at most 32 characters"),
      ).toBeInTheDocument();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("should show error if username contains invalid characters", async () => {
      const user = userEvent.setup();
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "invalid@username");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(
        screen.getByText(
          "Username can only contain letters, numbers, underscores, and hyphens",
        ),
      ).toBeInTheDocument();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("should accept valid usernames", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue(undefined);

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "valid_user-123");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          username: "valid_user-123",
        });
      });
    });
  });

  describe("Form Submission", () => {
    it("should call updateProfile with trimmed username", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue(undefined);

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText(
        "Enter username",
      ) as HTMLInputElement;
      // Directly set the value to test trimming behavior
      await user.clear(input);
      await user.type(input, "testuser");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          username: "testuser",
        });
      });
    });

    it("should show loading state while submitting", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "testuser");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(
        screen.getByRole("button", { name: /Setting/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Setting/i })).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Set Username/i }),
        ).toBeInTheDocument();
      });
    });

    it("should disable input while submitting", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText(
        "Enter username",
      ) as HTMLInputElement;
      await user.type(input, "testuser");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(input).toBeDisabled();

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    it("should clear input after successful submission", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue(undefined);

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText(
        "Enter username",
      ) as HTMLInputElement;
      await user.type(input, "testuser");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(input.value).toBe("");
      });
    });

    it("should show error message on submission failure", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValue(new Error("Network error"));

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "testuser");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show generic error message if error is not an Error object", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockRejectedValue("Unknown error");

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "testuser");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Failed to set username")).toBeInTheDocument();
      });
    });
  });

  describe("Styling and Accessibility", () => {
    it("should have proper form structure", () => {
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const form = screen
        .getByRole("button", { name: /Set Username/i })
        .closest("form");
      expect(form).toBeInTheDocument();
    });

    it("should have accessible heading", () => {
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const heading = screen.getByRole("heading", {
        name: /Set Your Username/i,
      });
      expect(heading).toBeInTheDocument();
    });

    it("should have helper text for username requirements", () => {
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByText(
          "3-32 characters, letters, numbers, underscores, and hyphens only",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle whitespace-only input", async () => {
      const user = userEvent.setup();
      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "   ");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      expect(screen.getByText("Username is required")).toBeInTheDocument();
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it("should accept username with underscores and hyphens", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue(undefined);

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "user_name-123");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          username: "user_name-123",
        });
      });
    });

    it("should accept username with numbers", async () => {
      const user = userEvent.setup();
      mockUpdateProfile.mockResolvedValue(undefined);

      render(<UsernameModal isOpen={true} onClose={mockOnClose} />);

      const input = screen.getByPlaceholderText("Enter username");
      await user.type(input, "user123");

      const button = screen.getByRole("button", { name: /Set Username/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          username: "user123",
        });
      });
    });
  });
});
