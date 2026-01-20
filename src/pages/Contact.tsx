import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";

const Contact = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero">
      <div className="container-wide text-center text-primary-foreground">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p className="text-xl text-primary-foreground/80">Book your free strategy call or send us a message</p>
      </div>
    </section>
    <section className="py-20 bg-background">
      <div className="container-wide grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
          <form className="space-y-4">
            <Input placeholder="Your Name" className="bg-card" />
            <Input type="email" placeholder="Your Email" className="bg-card" />
            <Input placeholder="Subject" className="bg-card" />
            <Textarea placeholder="Your Message" rows={5} className="bg-card" />
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Send Message</Button>
          </form>
        </div>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
          <div className="flex items-start gap-4"><Mail className="text-accent mt-1" size={20} /><div><p className="font-medium">Email</p><a href="mailto:hello@onemanbusiness.com" className="text-muted-foreground hover:text-accent">hello@onemanbusiness.com</a></div></div>
          <div className="flex items-start gap-4"><Phone className="text-accent mt-1" size={20} /><div><p className="font-medium">Phone</p><a href="tel:+919876543210" className="text-muted-foreground hover:text-accent">+91 98765 43210</a></div></div>
          <div className="flex items-start gap-4"><MapPin className="text-accent mt-1" size={20} /><div><p className="font-medium">Address</p><p className="text-muted-foreground">123 Business Park, Mumbai, Maharashtra 400001, India</p></div></div>
        </div>
      </div>
    </section>
  </Layout>
);

export default Contact;
