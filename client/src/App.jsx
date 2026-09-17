import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { NetworkWarning } from "./components/NetworkWarning";
import { Dashboard } from "./pages/Dashboard";
import { Plans } from "./pages/Plans";
import { MySubscription } from "./pages/MySubscription";
import { Verify } from "./pages/Verify";
import { Admin } from "./pages/Admin";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <NetworkWarning />
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/my-subscription" element={<MySubscription />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </WalletProvider>
  );
}
