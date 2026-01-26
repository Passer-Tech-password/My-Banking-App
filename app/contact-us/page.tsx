"use client";

import { useState } from "react";
import ContactInfoCard from "@/components/ContactInfoCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function ContactUsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log(form);
    alert("Message sent successfully");
  }

  return (
    <>
      <Navbar />
      <main className="w-full">
        {/* Hero Section */}
        <section className="bg-[#f4fbfa] py-20">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
              <p className="text-gray-600">Home / Contact</p>
            </div>
            <img
              src="/contact-illustration.svg"
              alt="Contact"
              className="hidden md:block w-80"
            />
          </div>
        </section>

        {/* Contact Info */}
        <section className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
          <ContactInfoCard
            title="Our Location"
            value="No. 14 Zik Avenue, Awka"
            icon="📍"
          />
          <ContactInfoCard
            title="Email Us"
            value="support@yourcompany.com"
            icon="✉️"
          />
          <ContactInfoCard
            title="Call Us"
            value="+234 905 097 9342"
            icon="📞"
          />
        </section>

        {/* Map */}
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <iframe
            title="Google Map"
            className="w-full h-[350px] rounded-lg border"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Awka,+Nigeria&output=embed"
          />
        </section>

        {/* Contact Form */}
        <section className="bg-[#f4fbfa] py-20">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-center text-3xl font-bold mb-10">
              Do You Have Any Questions?
            </h2>

            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <input
                name="name"
                placeholder="Your Name"
                value={form.name}
                onChange={handleChange}
                className="input"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Your Email"
                value={form.email}
                onChange={handleChange}
                className="input"
                required
              />
              <input
                name="phone"
                placeholder="Phone Number"
                value={form.phone}
                onChange={handleChange}
                className="input"
              />
              <input
                name="subject"
                placeholder="Subject"
                value={form.subject}
                onChange={handleChange}
                className="input"
              />

              <textarea
                name="message"
                placeholder="Your Message"
                value={form.message}
                onChange={handleChange}
                rows={5}
                className="input md:col-span-2"
                required
              />

              <button
                type="submit"
                className="md:col-span-2 bg-teal-500 text-white py-3 rounded-md font-semibold hover:bg-teal-600 transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
