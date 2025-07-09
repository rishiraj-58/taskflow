import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "TaskFlow - Modern Project Management Platform",
  description: "A comprehensive project management tool designed for development teams. Streamline your workflow with integrated sprint management, roadmap planning, bug tracking, and team collaboration.",
  keywords: "project management, agile, sprint planning, bug tracking, task management, development teams, workflow, collaboration",
  openGraph: {
    title: "TaskFlow - Modern Project Management Platform",
    description: "A comprehensive project management tool designed for development teams",
    url: "https://taskflow.app",
    siteName: "TaskFlow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskFlow - Modern Project Management Platform",
    description: "A comprehensive project management tool designed for development teams",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col scroll-smooth">
      <Navbar />
      <main className="flex-grow">
        <section id="home">
          <Hero />
        </section>
        <section id="features">
          <Features />
        </section>
        <section id="pricing">
          <Pricing />
        </section>
        <section id="contact">
          <Contact />
        </section>
      </main>
      <Footer />
    </div>
  );
}
