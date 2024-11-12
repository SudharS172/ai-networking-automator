"use client";

import { useState } from "react";
import Link from "next/link";

interface BatchCallRequest {
  numbers: string[];
  task: string;
  maxBudget?: number;
  email: string;
}

export default function BatchCallsPage() {
  const [numbers, setNumbers] = useState<string>("");
  const [task, setTask] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!email) {
        throw new Error("Email is required for batch call results");
      }

      // Split numbers and clean them
      const phoneNumbers = numbers
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n);

      const request: BatchCallRequest = {
        numbers: phoneNumbers,
        task,
        email,
        maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
      };

      const response = await fetch("/api/batch-calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate batch calls");
      }

      alert("Batch calls initiated! You will receive updates via email.");

      // Clear form
      setNumbers("");
      setTask("");
      setMaxBudget("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate calls");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Batch AI Calls</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to Home
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Email (for results)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Numbers (one per line)
              </label>
              <textarea
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                required
                className="w-full h-32 p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1234567890&#10;+1987654321&#10;+1555000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Description
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                className="w-full h-48 p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what you want Fox to do on these calls...&#10;Example: Call these hotels and find availability for tomorrow night under $300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Budget (optional)
              </label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="300"
              />
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Initiating Calls..." : "Start Batch Calls"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
