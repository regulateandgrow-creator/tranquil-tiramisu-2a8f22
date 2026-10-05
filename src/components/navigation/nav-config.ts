import {
  Home,
  HeartPulse,
  Leaf,
  Footprints,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  BadgeCheck,
  CalendarHeart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Short label for the mobile bottom bar */
  short: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", short: "Home", icon: Home },
  { href: "/my-body", label: "My Body", short: "Body", icon: HeartPulse },
  { href: "/nourish", label: "Nourish", short: "Nourish", icon: Leaf },
  { href: "/move", label: "Move", short: "Move", icon: Footprints },
  { href: "/intelligence", label: "GROWN. Intelligence", short: "Intel", icon: Sparkles },
  { href: "/progress", label: "Progress", short: "Progress", icon: TrendingUp },
];

export const secondaryNav: NavItem[] = [
  { href: "/my-products", label: "My Products", short: "Products", icon: ShoppingBag },
  { href: "/works-for-me", label: "Works For Me", short: "Works", icon: BadgeCheck },
  { href: "/weekly-body-meeting", label: "Weekly Body Meeting", short: "Weekly", icon: CalendarHeart },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

/** Items shown in the mobile bottom bar (5 max for comfortable tap targets). */
export const mobileNav: NavItem[] = [
  primaryNav[0], // Home
  primaryNav[1], // My Body
  primaryNav[4], // Intelligence (center)
  primaryNav[2], // Nourish
  primaryNav[5], // Progress
];
