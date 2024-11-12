"use client";

import { useState } from "react";
import { ResearchResult } from "@/lib/researchService";

export default function SmartSearchPage() {
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedResult, setSelectedResult] = useState<ResearchResult | null>(
    null
  );
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/smart-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async (result: ResearchResult) => {
    if (!result.phoneNumber) {
      setError("No phone number available for this business");
      return;
    }

    // Show confirmation dialog with details
    const confirmed = window.confirm(
      `Are you sure you want to call?\n\n` +
        `Business: ${result.name}\n` +
        `Phone: ${result.phoneNumber}\n` +
        `Address: ${result.address || "Not available"}\n\n` +
        `Custom instructions: ${customInstructions || "None provided"}`
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/make-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "smart-search",
          phoneNumber: result.phoneNumber,
          name: result.name,
          email,
          details: result.details,
          address: result.address,
          businessType: result.businessType || "business",
          query,
          customInstructions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate call");
      }

      const data = await response.json();
      console.log("Call initiated:", data);

      alert(`Calling ${result.name}. You will receive results via email.`);
    } catch (err) {
      console.error("Call error:", err);
      setError(err instanceof Error ? err.message : "Failed to make call");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Smart Search & Call
        </h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Email (for results)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          {/* Search Query Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you looking for?
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-32 p-2 border rounded"
              placeholder="e.g., Find hotels in NYC under $300 for New Year's Eve"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !query || !email}
            className={`w-full py-2 px-4 rounded-md text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            {results.map((result, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium">{result.name}</h3>
                <p className="text-gray-600 mt-1">{result.details}</p>
                {result.price && (
                  <p className="text-green-600 mt-2">Price: ${result.price}</p>
                )}
                {result.rating && (
                  <p className="text-blue-600 mt-1">Rating: {result.rating}</p>
                )}
                {result.address && (
                  <p className="text-gray-500 mt-1">{result.address}</p>
                )}

                {/* Custom Instructions Input */}
                <div className="mt-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Instructions for Fox (Optional)
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full h-24 p-2 border rounded"
                    placeholder="Add any specific instructions for Fox when making the call (e.g., Ask about parking availability, check for group discounts)"
                  />
                </div>

                <button
                  onClick={() => handleCall(result)}
                  className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Call Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
