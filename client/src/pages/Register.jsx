import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../store/auth-context.jsx";

const GoogleIcon = () => (
  <svg aria-hidden="true" className="h-[1.9rem] w-[1.9rem]" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.24 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.053 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.959 3.041l5.657-5.657C34.053 6.053 29.277 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.695 36 24 36c-5.219 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.201 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
    />
  </svg>
);

const initialState = {
  username: "",
  email: "",
  phone: "",
  password: "",
};

const getAuthErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.errors?.[0] ||
  error.response?.data?.message ||
  (error.request ? "Unable to reach the TicketHub server. Make sure the backend is running on port 5000." : fallbackMessage);

export const Register = () => {
  const [user, setUser] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const skipAlreadyLoggedInToastRef = useRef(false);
  const { isLoading, isLoggedIn, registerUser } = useAuth();
  const navigate = useNavigate();
  const pageClassName =
    "min-h-[calc(100vh-15rem)] bg-[radial-gradient(circle_at_top_left,_rgba(248,68,100,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(123,63,228,0.14),_transparent_26%),linear-gradient(180deg,_#fff8fa_0%,_#f5f5f5_100%)] py-[5.6rem] max-[640px]:py-[3.2rem]";
  const containerClassName =
    "mx-auto grid w-[min(120rem,calc(100%_-_3.2rem))] place-items-center";
  const cardClassName =
    "w-full max-w-[56rem] rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(255,255,255,0.94)] p-[3.2rem] shadow-[0_24px_60px_rgba(28,28,28,0.12)] max-[640px]:rounded-[2rem] max-[640px]:px-[2rem] max-[640px]:py-[2.4rem]";
  const eyebrowClassName =
    "inline-flex items-center rounded-full bg-[rgba(248,68,100,0.1)] px-[1.2rem] py-[0.7rem] text-[1.3rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]";
  const inputClassName =
    "w-full rounded-[1.4rem] border border-[rgba(28,28,28,0.14)] bg-white px-[1.4rem] py-[1.35rem] text-[1.5rem] text-[var(--color-text-primary)] outline-none transition-[border-color,box-shadow,transform] duration-200 placeholder:text-[#9ca3af] focus:border-[rgba(248,68,100,0.65)] focus:shadow-[0_0_0_0.4rem_rgba(248,68,100,0.12)] focus:-translate-y-px";
  const submitClassName =
    "mt-[0.4rem] w-full rounded-[1.4rem] bg-[var(--color-primary)] px-[1.8rem] py-[1.35rem] text-[1.6rem] font-extrabold text-[var(--color-text-light)] transition-[transform,box-shadow,background] duration-200 hover:bg-[var(--color-primary-hover)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_16px_28px_rgba(248,68,100,0.22)] disabled:cursor-wait disabled:opacity-80";

  useEffect(() => {
    if (isLoading || !isLoggedIn) {
      return;
    }

    if (skipAlreadyLoggedInToastRef.current) {
      skipAlreadyLoggedInToastRef.current = false;
      return;
    }

    toast.info("You are already logged in.");
    navigate("/", { replace: true });
  }, [isLoading, isLoggedIn, navigate]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await registerUser({
        username: user.username.trim(),
        email: user.email.trim().toLowerCase(),
        phone: user.phone.trim(),
        password: user.password,
      });
      skipAlreadyLoggedInToastRef.current = true;
      toast.success(response.message || "Registration successful");
      setUser(initialState);
      navigate("/");
    } catch (error) {
      const message = getAuthErrorMessage(error, "Registration failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={pageClassName}>
      <div className={containerClassName}>
        <div className={cardClassName}>
          <span className={eyebrowClassName}>Create account</span>
          <h1 className="mt-[1.6rem] text-[clamp(3rem,4vw,4.2rem)] leading-[1.2] font-extrabold tracking-[-0.02em]">
            Join TicketHub
          </h1>
          <p className="mt-[1.2rem] text-[1.6rem] leading-[1.7] text-[var(--color-text-secondary)]">
            Create your account to discover events, book tickets, and manage every booking with ease.
          </p>

          <a
            href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth"}/google`}
            className="mt-[2.2rem] inline-flex w-full items-center justify-center gap-[1rem] rounded-[1.4rem] border border-[rgba(28,28,28,0.14)] bg-white px-[1.8rem] py-[1.2rem] text-[1.45rem] font-bold text-[var(--color-text-primary)] transition-[border-color,box-shadow,transform] duration-200 hover:border-[rgba(248,68,100,0.35)] hover:shadow-[0_12px_24px_rgba(248,68,100,0.12)] hover:-translate-y-px"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="my-[2rem] flex items-center gap-[1rem]">
            <div className="h-px flex-1 bg-[rgba(28,28,28,0.08)]" />
            <span className="text-[1.2rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              Or register with email
            </span>
            <div className="h-px flex-1 bg-[rgba(28,28,28,0.08)]" />
          </div>

          <form className="mt-[2.6rem] grid gap-[1.6rem]" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-[1.6rem] max-[640px]:grid-cols-1">
              <div className="grid gap-[0.8rem]">
                <label
                  className="text-[1.4rem] font-bold text-[var(--color-text-primary)]"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  className={inputClassName}
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your name"
                  value={user.username}
                  onChange={handleInput}
                  required
                />
              </div>

              <div className="grid gap-[0.8rem]">
                <label
                  className="text-[1.4rem] font-bold text-[var(--color-text-primary)]"
                  htmlFor="phone"
                >
                  Phone
                </label>
                <input
                  className={inputClassName}
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={user.phone}
                  onChange={handleInput}
                  required
                />
              </div>
            </div>

            <div className="grid gap-[0.8rem]">
              <label
                className="text-[1.4rem] font-bold text-[var(--color-text-primary)]"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className={inputClassName}
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={user.email}
                onChange={handleInput}
                required
              />
            </div>

            <div className="grid gap-[0.8rem]">
              <label
                className="text-[1.4rem] font-bold text-[var(--color-text-primary)]"
                htmlFor="password"
              >
                Password
              </label>
              <input
                className={inputClassName}
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={user.password}
                onChange={handleInput}
                required
              />
            </div>

            <button className={submitClassName} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-[2rem] text-center text-[1.5rem] text-[var(--color-text-secondary)]">
            Already have an account?{" "}
            <NavLink
              className="text-[inherit] text-[var(--color-primary)]"
              to="/login"
            >
              Login
            </NavLink>
          </p>
        </div>
      </div>
    </section>
  );
};
