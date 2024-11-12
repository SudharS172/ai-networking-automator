import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-4 items-center">
              <Link href="/" className="text-gray-900 font-medium">
                Home
              </Link>
              <Link
                href="/join-network"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Join Network
              </Link>
              <Link
                href="/batch-calls"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Batch Calls
              </Link>
              <Link
                href="/automation"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Automation
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Networking and automator while you sleep
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with professionals, automate things, and grow your network
              using our intelligent AI assistants.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Professional Network</h2>
              <p className="text-gray-600 mb-4">
                Join our AI-powered networking platform to connect with like-minded
                professionals.
                AI will call you and connect you with right people in our network for your need. <br />
                Example: It can find a cofounder for your startup.
                <br />
                Example: It can find a investor for your startup.
              </p>
              <Link
                href="/join-network"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                Join Network →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Batch Calls</h2>
              <p className="text-gray-600 mb-4">
                Make single or multiple AI calls at once with consolidated reporting and analysis.
              </p>
              <div className="text-gray-400 text-sm mb-4">
                Example: Call John and inform him that meeting is cancelled.
                <br />
                Example: Call all the customers and inform them that we have launched a new product.
              </div>
              <Link
                href="/batch-calls"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                Try Batch Calls →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Browser Automation</h2>
              <p className="text-gray-600 mb-4">
                AI that takes actions in the browser
              </p>
              <Link
                href="/automation"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                Start Automating →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold mb-3">Smart Search</h2>
              <p className="text-gray-600 mb-4">
              Research and automatically call the best options for your needs.
              </p>
              <Link
                href="/smart-search"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                Start Searching →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
