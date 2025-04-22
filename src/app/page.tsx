import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "TaskFlow - Project Management Tool",
  description: "A comprehensive project management tool for development teams. Integrate sprint management, roadmap planning, bug tracking, and team collaboration in one centralized platform.",
  keywords: "project management, agile, sprint planning, bug tracking, task management, development teams",
  openGraph: {
    title: "TaskFlow - Project Management Tool",
    description: "A comprehensive project management tool for development teams",
    url: "https://taskflow.app",
    siteName: "TaskFlow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskFlow - Project Management Tool",
    description: "A comprehensive project management tool for development teams",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow mt-16">
        <Hero />
        <Features />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
