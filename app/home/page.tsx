import { Metadata } from "next";
import Hero from "./hero";
import PrivacyComponent from "./privacy";
import UPSCPromoCard from "@/components/blog/Upscpromocard";

export const metadata: Metadata = {
  title:
    "Resize Documents for Government Exams - Free Online Tool | SahiPhoto.in",
  description:
    "Free government exam all documents resizer. Resize photo and signature for SSC, UPSC, AFCAT, JEE, NEET, BPSC, Railway RRB and 100+ exams. Instant resizing without signup. Updated 2026 requirements.",
  keywords: [
    "government exam photo resize",
    "exam photo resizer",
    "exam documents resizer",
    "SSC photo size",
    "UPSC photo requirements",
    "JEE photo size",
    "NEET photo size",
    "free photo resize tool",
    "exam signature resize",
    "online photo resizer",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

function HomePage() {
  return (
    <>
        <div className="container mx-auto px-2 pb-0 py-6">
          <div className="grid lg:grid-row-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* Left Section - Hero */}
            <div className="flex flex-col justify-center items-center text-center space-y-4 md:space-y-6">
              <Hero></Hero>
              <PrivacyComponent></PrivacyComponent>
              
            </div><UPSCPromoCard></UPSCPromoCard>
          </div>
        </div>
    </>
  );
}

export default HomePage;
