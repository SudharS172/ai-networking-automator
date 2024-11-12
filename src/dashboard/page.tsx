"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CallRecord {
  id: string;
  blandCallId: string;
  status: string;
  transcript: string | null;
  analysis: any;
  recordingUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  user: {
    name: string;
    email: string;
    phoneNumber: string;
  };
}

export default function DashboardPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [filter, setFilter] = useState("all"); // 'all', 'completed', 'scheduled'

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await fetch("/api/calls");
      const data = await response.json();
      setCalls(data);
      // If there are calls, select the first one by default
      if (data.length > 0) {
        setSelectedCall(data[0]);
      }
    } catch (error) {
      console.error("Error fetching calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredCalls = calls.filter((call) => {
    if (filter === "all") return true;
    return call.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Call Records</h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
            >
              Make New Call
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Calls</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Call List */}
          <div className="lg:w-1/3 space-y-4">
            {filteredCalls.map((call) => (
              <div
                key={call.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedCall?.id === call.id
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setSelectedCall(call)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{call.user.name}</h3>
                    <p className="text-sm text-gray-600">{call.user.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-sm rounded ${
                      call.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {call.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Created: {formatDate(call.createdAt)}</p>
                  {call.completedAt && (
                    <p>Completed: {formatDate(call.completedAt)}</p>
                  )}
                </div>
              </div>
            ))}

            {filteredCalls.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
                No calls found.
              </div>
            )}
          </div>

          {/* Call Details */}
          <div className="lg:w-2/3">
            {selectedCall ? (
              <div className="bg-white rounded-lg border p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Call Details
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p>
                        <strong>Name:</strong> {selectedCall.user.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {selectedCall.user.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {selectedCall.user.phoneNumber}
                      </p>
                    </div>
                    <div>
                      <p>
                        <strong>Status:</strong> {selectedCall.status}
                      </p>
                      <p>
                        <strong>Created:</strong>{" "}
                        {formatDate(selectedCall.createdAt)}
                      </p>
                      {selectedCall.completedAt && (
                        <p>
                          <strong>Completed:</strong>{" "}
                          {formatDate(selectedCall.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedCall.recordingUrl && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Recording</h3>
                    <audio controls className="w-full">
                      <source
                        src={selectedCall.recordingUrl}
                        type="audio/mpeg"
                      />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {selectedCall.transcript && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Transcript</h3>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {selectedCall.transcript}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedCall.analysis && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Analysis</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-4">
                        {Object.entries(selectedCall.analysis).map(
                          ([key, value]) => (
                            <div key={key}>
                              <h4 className="font-medium text-gray-900 capitalize mb-2">
                                {key.replace(/_/g, " ")}
                              </h4>
                              <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
                Select a call to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
