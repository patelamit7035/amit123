import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const programs = [
  {
    title: "3 Day AI Bootcamp",
    href: "/programs/ai-bootcamp",
    description: "Master AI tools in just 3 days and automate 80% of your tasks.",
  },
  {
    title: "Automate Entire Business",
    href: "/programs/automation",
    description: "Custom automation systems that work while you sleep.",
  },
  {
    title: "Personalized Business Consulting",
    href: "/programs/consulting",
    description: "1-on-1 strategic guidance tailored to your goals.",
  },
  {
    title: "Start Your SaaS Business",
    href: "/programs/saas",
    description: "Launch your SaaS in 90 days - from idea to paying customers.",
  },
];

const aboutLinks = [
  {
    title: "About Amit Patel",
    href: "/about",
    description: "Meet the founder behind Oneman Business.",
  },
  {
    title: "Why Oneman Business",
    href: "/why-us",
    description: "Discover what makes us different.",
  },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-wide flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-foreground">
            Oneman<span className="text-accent">Business</span>
            <sup className="text-xs align-super ml-0.5">™</sup>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent focus:outline-none",
                    location.pathname === "/" && "text-accent"
                  )}
                >
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-accent/10 hover:text-accent data-[state=open]:bg-accent/10">
                Programs
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {programs.map((program) => (
                    <li key={program.title}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={program.href}
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                        >
                          <div className="text-sm font-medium leading-none">
                            {program.title}
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {program.description}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent hover:bg-accent/10 hover:text-accent data-[state=open]:bg-accent/10">
                About
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-3 p-4 w-[300px]">
                  {aboutLinks.map((link) => (
                    <li key={link.title}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={link.href}
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
                        >
                          <div className="text-sm font-medium leading-none">
                            {link.title}
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {link.description}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/tools/screen-camera">
                <NavigationMenuLink
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent focus:outline-none",
                    location.pathname === "/tools/screen-camera" && "text-accent"
                  )}
                >
                  Screen &amp; Camera
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/contact">
                <NavigationMenuLink
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent focus:outline-none",
                    location.pathname === "/contact" && "text-accent"
                  )}
                >
                  Contact
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA Button */}
        <div className="hidden lg:flex items-center gap-4">
          <Link to="/contact">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-accent">
              Book a Free Call
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-wide py-4 space-y-4">
            <Link
              to="/"
              className="block py-2 text-foreground hover:text-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            <div className="space-y-2">
              <div className="flex items-center gap-1 py-2 text-foreground font-medium">
                <span>Programs</span>
                <ChevronDown size={16} />
              </div>
              <div className="pl-4 space-y-2">
                {programs.map((program) => (
                  <Link
                    key={program.title}
                    to={program.href}
                    className="block py-1 text-muted-foreground hover:text-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {program.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 py-2 text-foreground font-medium">
                <span>About</span>
                <ChevronDown size={16} />
              </div>
              <div className="pl-4 space-y-2">
                {aboutLinks.map((link) => (
                  <Link
                    key={link.title}
                    to={link.href}
                    className="block py-1 text-muted-foreground hover:text-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              to="/tools/screen-camera"
              className="block py-2 text-foreground hover:text-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Screen &amp; Camera
            </Link>

            <Link
              to="/contact"
              className="block py-2 text-foreground hover:text-accent transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>

            <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold mt-4">
                Book a Free Call
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
