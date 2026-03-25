import { NavLink } from "react-router-dom";

export const Footer = () => {
  const year = new Date().getFullYear();
  const containerClassName = "mx-auto w-[min(120rem,calc(100%_-_3.2rem))]";
  const footerLinkClassName = ({ isActive }) =>
    [
      "text-[1.5rem] text-[var(--color-text-secondary)] transition-colors duration-200",
      isActive
        ? "text-[var(--color-primary)]"
        : "hover:text-[var(--color-primary)]",
    ].join(" ");

  return (
    <footer className="mt-[6rem] border-t border-[rgba(28,28,28,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fff3f5_100%)]">
      <div
        className={`${containerClassName} grid grid-cols-[2fr_1fr_1fr_1.4fr] gap-[2.8rem] pt-[2.6rem] pb-[2.4rem] max-[980px]:grid-cols-2 max-[680px]:grid-cols-1`}
      >
        <div>
          <h3 className="mb-[1rem] text-[2.4rem] font-bold text-[var(--color-primary)]">
            TicketHub
          </h3>
          <p className="max-w-[36ch] text-[1.5rem] leading-[1.7] text-[var(--color-text-secondary)]">
            Book movies, sports, and events with a smooth and secure flow.
          </p>
        </div>

        <div>
          <h4 className="mb-[1rem] text-[1.9rem] font-semibold text-[var(--color-text-primary)]">
            Quick Links
          </h4>
          <ul className="grid gap-[0.8rem]">
            <li>
              <NavLink className={footerLinkClassName} to="/">
                Home
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} to="/events">
                Events
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} to="/about">
                About
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} to="/contact">
                Contact
              </NavLink>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-[1rem] text-[1.9rem] font-semibold text-[var(--color-text-primary)]">
            Account
          </h4>
          <ul className="grid gap-[0.8rem]">
            <li>
              <NavLink className={footerLinkClassName} to="/register">
                Register
              </NavLink>
            </li>
            <li>
              <NavLink className={footerLinkClassName} to="/login">
                Login
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="grid gap-[0.8rem]">
          <h4 className="mb-[0.2rem] text-[1.9rem] font-semibold text-[var(--color-text-primary)]">
            Contact
          </h4>
          <p className="text-[1.5rem] text-[var(--color-text-secondary)]">
            Email: support@tickethub.com
          </p>
          <p className="text-[1.5rem] text-[var(--color-text-secondary)]">
            Phone: +91 6354074492
          </p>
        </div>
      </div>

      <div className="border-t border-[rgba(28,28,28,0.08)] px-[1rem] py-[1.6rem] text-center">
        <p className="text-[1.4rem] text-[var(--color-text-secondary)]">
          Copyright {year} TicketHub. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
