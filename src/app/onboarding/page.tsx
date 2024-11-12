"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    phoneNumber: "",
    professionalField: "",
    currentRole: "",
    skills: "",
    interests: "",
    connectionType: "mentorship", // default value
    interactionStyle: "virtual", // default value
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/profile/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          skills: formData.skills.split(",").map((s) => s.trim()),
          interests: formData.interests.split(",").map((i) => i.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      // Schedule the AI call
      const callResponse = await fetch("/api/schedule-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          name: session?.user?.name,
          email: session?.user?.email,
        }),
      });

      if (!callResponse.ok) {
        throw new Error("Failed to schedule call");
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Help us understand your interests and preferences to find the best
            connections for you.
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Professional Field
              </label>
              <input
                type="text"
                name="professionalField"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.professionalField}
                onChange={handleChange}
                placeholder="e.g., Software Development, Marketing, Finance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Role
              </label>
              <input
                type="text"
                name="currentRole"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.currentRole}
                onChange={handleChange}
                placeholder="e.g., Software Engineer, Marketing Manager"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Skills (comma-separated)
              </label>
              <textarea
                name="skills"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., JavaScript, Project Management, Public Speaking"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Interests (comma-separated)
              </label>
              <textarea
                name="interests"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.interests}
                onChange={handleChange}
                placeholder="e.g., AI/ML, Startup Culture, Digital Marketing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Connection Type
              </label>
              <select
                name="connectionType"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.connectionType}
                onChange={handleChange}
              >
                <option value="mentorship">Mentorship</option>
                <option value="collaboration">Collaboration</option>
                <option value="networking">Professional Networking</option>
                <option value="social">Social Connections</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Preferred Interaction Style
              </label>
              <select
                name="interactionStyle"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.interactionStyle}
                onChange={handleChange}
              >
                <option value="virtual">Virtual</option>
                <option value="in-person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Setting Up..." : "Complete Setup & Schedule Call"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
