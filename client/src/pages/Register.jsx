import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../store/auth.jsx";

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
  const { registerUser } = useAuth();
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
            Create your account to book movies, sports, and live events with one smooth flow.
          </p>

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
