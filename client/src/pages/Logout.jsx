import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../store/auth.jsx";

export const Logout = () => {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();
  const pageClassName =
    "min-h-[calc(100vh-15rem)] bg-[radial-gradient(circle_at_top_left,_rgba(248,68,100,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(123,63,228,0.14),_transparent_26%),linear-gradient(180deg,_#fff8fa_0%,_#f5f5f5_100%)] py-[5.6rem] max-[640px]:py-[3.2rem]";
  const containerClassName =
    "mx-auto grid w-[min(120rem,calc(100%_-_3.2rem))] place-items-center";
  const cardClassName =
    "w-full max-w-[56rem] rounded-[2.4rem] border border-[rgba(28,28,28,0.08)] bg-[rgba(255,255,255,0.94)] p-[3.2rem] text-center shadow-[0_24px_60px_rgba(28,28,28,0.12)] max-[640px]:rounded-[2rem] max-[640px]:px-[2rem] max-[640px]:py-[2.4rem]";
  const eyebrowClassName =
    "inline-flex items-center rounded-full bg-[rgba(248,68,100,0.1)] px-[1.2rem] py-[0.7rem] text-[1.3rem] font-extrabold uppercase tracking-[0.08em] text-[var(--color-primary)]";

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    const handleLogout = async () => {
      hasRun.current = true;
      await logoutUser();
      toast.success("Logout successful");
      navigate("/login");
    };

    handleLogout();
  }, [logoutUser, navigate]);

  return (
    <section className={pageClassName}>
      <div className={containerClassName}>
        <div className={cardClassName}>
          <span className={eyebrowClassName}>Signing out</span>
          <h1 className="mt-[1.6rem] text-[clamp(3rem,4vw,4.2rem)] leading-[1.2] font-extrabold tracking-[-0.02em]">
            Logging you out
          </h1>
          <p className="mt-[1.2rem] text-[1.6rem] leading-[1.7] text-[var(--color-text-secondary)]">
            Please wait while we close your TicketHub session.
          </p>
        </div>
      </div>
    </section>
  );
};
