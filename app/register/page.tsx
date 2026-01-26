"use client";

import { useState } from "react";
import { User } from "@/lib/User";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    address: "",
    state: "",
    city: "",
    zipCode: "",
    dob: "",
    mobile: "",
    phone: "",
    email: "",
    accountType: "",
    currency: "",
    ssnPin: "",
    password: "",
    confirmPassword: "",
    passport: null as File | null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, passport: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create user using the Builder pattern
      const newUser = User.builder()
        .setFirstName(formData.firstName)
        .setMiddleName(formData.middleName)
        .setLastName(formData.lastName)
        .setAddress(formData.address)
        .setState(formData.state)
        .setCity(formData.city)
        .setZipCode(formData.zipCode)
        .setDob(formData.dob)
        .setMobile(formData.mobile)
        .setPhone(formData.phone)
        .setEmail(formData.email)
        .setAccountType(formData.accountType)
        .setCurrency(formData.currency)
        .setSsnPin(formData.ssnPin)
        .setPassword(formData.password)
        // Note: In a real app, you would upload the file first and get a URL
        .setPassportUrl(formData.passport ? formData.passport.name : "")
        .build();

      console.log("User created successfully with Builder:", newUser);
      alert("User created successfully! Check console for details.");
    } catch (error) {
      console.error("Error creating user:", error);
      alert(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 flex justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-5xl bg-white shadow-md rounded-md p-6"
        >
          {/* Header */}
          <h2 className="text-lg font-semibold text-blue-800 mb-4">
            Kindly provide the information required below to enable us create an
            account for you
          </h2>

          {/* Personal Details */}
          <h3 className="font-semibold mb-3">Personal Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              className="input"
              onChange={handleChange}
            />
            <input
              name="middleName"
              placeholder="Middle Name"
              className="input"
              onChange={handleChange}
            />
            <input
              name="lastName"
              placeholder="Last Name"
              className="input"
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <input
              name="address"
              placeholder="Address"
              className="input"
              onChange={handleChange}
            />
            <input
              name="state"
              placeholder="State / Region"
              className="input"
              onChange={handleChange}
            />
            <input
              name="city"
              placeholder="City"
              className="input"
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <input
              name="zipCode"
              placeholder="Zip Code"
              className="input"
              onChange={handleChange}
            />
            <input
              type="date"
              name="dob"
              className="input"
              onChange={handleChange}
            />
            <input
              name="mobile"
              placeholder="Mobile Number"
              className="input"
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input
              name="phone"
              placeholder="Phone Number"
              className="input"
              onChange={handleChange}
            />
            <input
              name="email"
              placeholder="Email Address"
              className="input"
              onChange={handleChange}
            />
          </div>

          {/* Banking Details */}
          <h3 className="font-semibold mt-6 mb-3">Banking Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              name="accountType"
              className="input"
              onChange={handleChange}
            >
              <option value="">Choose account type</option>
              <option>Savings</option>
              <option>Current</option>
            </select>

            <select name="currency" className="input" onChange={handleChange}>
              <option value="">Choose account currency</option>
              <option>NGN</option>
              <option>USD</option>
              <option>EUR</option>
            </select>

            <input
              name="ssnPin"
              placeholder="SSN PIN"
              className="input"
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-center">
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="input"
              onChange={handleChange}
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="input"
              onChange={handleChange}
            />

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-500">Photo</span>
              </div>
              <input type="file" onChange={handleFileChange} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Submit
            </button>
            <button
              type="reset"
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Reset
            </button>
            <button
              type="button"
              className="text-blue-600 underline"
              onClick={() => history.back()}
            >
              ← Back
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </>
  );
}
