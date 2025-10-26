import { NavLink } from "react-router-dom";
import { AcademicCapIcon, BookmarkIcon, HomeIcon, ListBulletIcon } from "@heroicons/react/24/outline";

const navItems = [
  { name: "Dashboard", to: "/app/dashboard", icon: HomeIcon },
  { name: "All Decks", to: "/app/dashboard?view=all", icon: ListBulletIcon },
  { name: "Due Reviews", to: "/app/dashboard?view=due", icon: AcademicCapIcon },
  { name: "Pinned", to: "/app/dashboard?view=pinned", icon: BookmarkIcon }
];

export const SidebarNav = () => {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900/70"
            }`
          }
        >
          <item.icon className="size-5" />
          <span>{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
};

