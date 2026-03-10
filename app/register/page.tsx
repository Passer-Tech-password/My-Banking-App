"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/User";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const initialFormData = {
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
  };
  const [formData, setFormData] = useState(initialFormData);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);

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

  const handleReset = () => {
    setFormData(initialFormData);
    setFileInputKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      if (!formData.firstName || !formData.lastName || !email || !formData.password) {
        throw new Error("Please fill in all required fields");
      }
      if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
      }

      // 1. Create User in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Create user object using the Builder pattern
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
        .setEmail(email)
        .setAccountType(formData.accountType)
        .setCurrency(formData.currency)
        .setSsnPin(formData.ssnPin)
        .setRole("user") // Default role
        // Note: In a real app, upload file to storage and get URL
        .setPassportUrl(formData.passport ? formData.passport.name : "") 
        .build();

      // 3. Save extra details to Firestore
      // We don't save password in Firestore
      const { password, ...userData } = newUser;
      
      await setDoc(doc(db, "users", uid), {
          ...userData,
          createdAt: serverTimestamp(),
          balance: 0, // Initialize balance
          blocked: false
      });

      await setDoc(
        doc(db, "publicUsers", uid),
        {
          email,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      console.log("User created successfully:", newUser);
      toast.success("Account created successfully!");
      router.push("/dashboard");

    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
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
            account for you with Aurora Bank.
          </h2>

          {/* Personal Details */}
          <h3 className="font-semibold mb-3">Personal Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              className="input"
              onChange={handleChange}
              value={formData.firstName}
              required
            />
            <input
              name="middleName"
              placeholder="Middle Name"
              className="input"
              onChange={handleChange}
              value={formData.middleName}
            />
            <input
              name="lastName"
              placeholder="Last Name"
              className="input"
              onChange={handleChange}
              value={formData.lastName}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <input
              name="address"
              placeholder="Address"
              className="input"
              onChange={handleChange}
              value={formData.address}
            />
            <input
              name="state"
              placeholder="State / Region"
              className="input"
              onChange={handleChange}
              value={formData.state}
            />
            <input
              name="city"
              placeholder="City"
              className="input"
              onChange={handleChange}
              value={formData.city}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <input
              name="zipCode"
              placeholder="Zip Code"
              className="input"
              onChange={handleChange}
              value={formData.zipCode}
            />
            <input
              type="date"
              name="dob"
              className="input"
              onChange={handleChange}
              value={formData.dob}
            />
            <input
              name="mobile"
              placeholder="Mobile Number"
              className="input"
              onChange={handleChange}
              value={formData.mobile}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input
              name="phone"
              placeholder="Phone Number"
              className="input"
              onChange={handleChange}
              value={formData.phone}
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="input"
              onChange={handleChange}
              value={formData.email}
              required
            />
          </div>

          {/* Banking Details */}
          <h3 className="font-semibold mt-6 mb-3">Banking Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              name="accountType"
              className="input"
              onChange={handleChange}
              value={formData.accountType}
              required
            >
              <option value="">Choose account type</option>
              <option>Savings</option>
              <option>Current</option>
            </select>

            <select
              name="currency"
              className="input"
              onChange={handleChange}
              value={formData.currency}
              required
            >
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
              value={formData.ssnPin}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-center">
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="input"
              onChange={handleChange}
              value={formData.password}
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="input"
              onChange={handleChange}
              value={formData.confirmPassword}
              required
            />

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-500">Photo</span>
              </div>
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-70"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Reset
            </button>
            <button
              type="button"
              className="text-blue-600 underline"
              onClick={() => router.back()}
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
