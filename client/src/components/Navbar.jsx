import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Heart, Search } from "lucide-react";
import { LocationPicker } from "./LocationPicker.jsx";
import { SearchModal } from "./SearchModal.jsx";
import { useAuth } from "../store/auth.jsx";
import { useWishlist } from "../store/wishlist.jsx";

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isAdmin, isLoggedIn, userName } = useAuth();
  const { wishlistCount } = useWishlist();

  const desktopLinkClassName = ({ isActive }) =>
    [
      "rounded-full border border-transparent px-[1.4rem] py-[1rem] text-[1.5rem] font-semibold text-[var(--color-text-secondary)] transition-all duration-[250ms]",
      isActive
        ? "border-[rgba(248,68,100,0.18)] bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)]"
        : "hover:border-[rgba(248,68,100,0.18)] hover:bg-[rgba(248,68,100,0.08)] hover:text-[var(--color-primary)]",
    ].join(" ");

  const mobileLinkClassName = ({ isActive }) =>
    [
      "rounded-[1.4rem] border border-transparent bg-[var(--color-bg-card)] px-[1.4rem] py-[1.2rem] text-[1.6rem] font-semibold text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)] transition-all duration-[250ms]",
      isActive
        ? "border-[rgba(248,68,100,0.18)] bg-[rgba(248,68,100,0.08)] text-[var(--color-primary)]"
        : "hover:border-[rgba(248,68,100,0.18)] hover:bg-[rgba(248,68,100,0.08)] hover:text-[var(--color-primary)]",
    ].join(" ");

  const iconButtonClassName =
    "relative inline-flex h-[4.4rem] w-[4.4rem] items-center justify-center rounded-full border border-[rgba(28,28,28,0.08)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] transition-all duration-[250ms] hover:border-[rgba(248,68,100,0.18)] hover:bg-[rgba(248,68,100,0.08)] hover:text-[var(--color-primary)]";

  const baseLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/movies", label: "Movies" },
    { to: "/sports", label: "Sports" },
    { to: "/events", label: "Events" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];
  const authActionLinks = isLoggedIn
    ? [{ to: "/logout", label: "Logout" }]
    : [
        { to: "/register", label: "Register" },
        { to: "/login", label: "Login" },
      ];
  const mobileLinks = [
    ...baseLinks,
    { to: "/wishlist", label: "Wishlist" },
    ...authActionLinks,
  ];
  const greeting = userName ? `Hi, ${userName}` : "";

  return (
    <>
      <header className="sticky top-0 z-[1100] border-b border-[rgba(28,28,28,0.08)] bg-[rgba(255,255,255,0.88)] shadow-[0_14px_30px_rgba(28,28,28,0.06)] backdrop-blur-[18px]">
        <div className="w-full px-[2rem]">
          <div className="grid min-h-[7.6rem] grid-cols-[auto_1fr_auto] items-center gap-[1.6rem] max-[980px]:flex max-[980px]:min-h-[7rem] max-[980px]:justify-between">
            <div className="flex min-w-0 items-center gap-[1.2rem]">
              <NavLink
                to="/"
                className="inline-flex shrink-0 items-center"
                onClick={() => setMobileOpen(false)}
              >
                <span className="text-[2.8rem] font-extrabold tracking-[0.04em] text-[var(--color-primary)]">
                  TicketHub
                </span>
              </NavLink>
              <div className="max-[980px]:hidden">
                <LocationPicker />
              </div>
            </div>

            <nav className="flex min-w-0 flex-wrap items-center justify-center gap-[0.8rem] max-[980px]:hidden">
              {baseLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={desktopLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex min-w-0 items-center justify-end gap-[1rem] max-[980px]:hidden">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={iconButtonClassName}
                aria-label="Open search"
              >
                <Search className="h-[1.9rem] w-[1.9rem]" />
              </button>

              <NavLink to="/wishlist" className={iconButtonClassName} aria-label="Open wishlist">
                <Heart className={`h-[1.9rem] w-[1.9rem] ${wishlistCount ? "fill-current" : ""}`} />
                {wishlistCount ? (
                  <span className="absolute -right-[0.1rem] -top-[0.2rem] inline-flex min-w-[1.9rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-[0.45rem] py-[0.2rem] text-[1rem] font-extrabold leading-none text-[var(--color-text-light)]">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                ) : null}
              </NavLink>

              {isLoggedIn && greeting ? (
                <span className="text-[1.5rem] font-bold text-[var(--color-text-primary)]">
                  {greeting}
                </span>
              ) : null}

              {authActionLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={desktopLinkClassName}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              className="ml-auto hidden cursor-pointer items-center justify-center rounded-full border border-[rgba(248,68,100,0.2)] bg-[var(--color-primary)] px-[1.6rem] py-[0.95rem] text-[1.4rem] font-bold text-[var(--color-text-light)] max-[980px]:inline-flex"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[rgba(28,28,28,0.08)] bg-[rgba(255,255,255,0.96)]">
            <nav className="grid gap-[1rem] px-[2rem] py-[1.6rem] pb-[2rem]">
              <LocationPicker mobile onSelect={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-[0.8rem] rounded-[1.4rem] border border-[rgba(28,28,28,0.08)] bg-[var(--color-bg-card)] px-[1.4rem] py-[1.2rem] text-[1.6rem] font-semibold text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]"
              >
                <Search className="h-[1.8rem] w-[1.8rem]" />
                Search
              </button>
              {mobileLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={mobileLinkClassName}
                >
                  {link.label}
                </NavLink>
              ))}
              {isLoggedIn && greeting ? (
                <span className="text-[1.5rem] font-bold text-[var(--color-text-primary)]">
                  {greeting}
                </span>
              ) : null}
            </nav>
          </div>
        )}
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
