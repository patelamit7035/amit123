import { Link } from "react-router-dom";
import { Linkedin, Twitter, Youtube, Mail, Phone, MapPin } from "lucide-react";

const quickLinks = [
  { title: "All Programs", href: "/programs/ai-bootcamp" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
  { title: "FAQ", href: "/#faq" },
];

const legalLinks = [
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Terms of Service", href: "/terms" },
  { title: "Refund Policy", href: "/refund" },
  { title: "Disclaimer", href: "/disclaimer" },
];

const socialLinks = [
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-wide py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <span className="text-xl font-bold">
                Oneman<span className="text-accent">Business</span>
                <sup className="text-xs align-super ml-0.5">™</sup>
              </span>
            </Link>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Helping solopreneurs build & automate profitable businesses using AI and proven systems.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-primary-foreground/10 hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.title}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors text-sm"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.title}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors text-sm"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Mail size={18} className="text-accent mt-0.5 shrink-0" />
                <a
                  href="mailto:hello@onemanbusiness.com"
                  className="text-primary-foreground/80 hover:text-accent transition-colors text-sm"
                >
                  hello@onemanbusiness.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-accent mt-0.5 shrink-0" />
                <a
                  href="tel:+919876543210"
                  className="text-primary-foreground/80 hover:text-accent transition-colors text-sm"
                >
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-accent mt-0.5 shrink-0" />
                <span className="text-primary-foreground/80 text-sm">
                  123 Business Park,<br />
                  Mumbai, Maharashtra 400001,<br />
                  India
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-foreground/60 text-sm">
              © {currentYear} Oneman Business™ | All Rights Reserved
            </p>
            <div className="flex items-center gap-4 text-primary-foreground/60 text-sm">
              <span>TM Registered Business</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">GSTIN: XXXXXXXXXX</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
