import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-48 w-96 h-96 bg-indigo-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <div className="relative max-w-screen-xl mx-auto px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          {/* Hero Content */}
          <div className="md:col-span-7 space-y-8 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              <span className="block">Streamline Your</span>
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Team's Workflow
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto md:mx-0 text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              A powerful project management platform that integrates sprint planning, 
              roadmapping, bug tracking, and team collaboration — all in one 
              seamless experience.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get started free
                <svg
                  className="w-5 h-5 ml-2 -mr-1 transition-transform duration-300 group-hover:translate-x-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                See features
              </Link>
            </div>
            
            {/* Social proof section */}
            <div className="pt-6 mt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Trusted by development teams at</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-6 opacity-70">
                {/* Company logos - simplified for the example */}
                <div className="h-8 text-gray-400 dark:text-gray-500">Company A</div>
                <div className="h-8 text-gray-400 dark:text-gray-500">Company B</div>
                <div className="h-8 text-gray-400 dark:text-gray-500">Company C</div>
                <div className="h-8 text-gray-400 dark:text-gray-500">Company D</div>
              </div>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="md:col-span-5 relative">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl transform perspective-1000 group">
              {/* Mock dashboard image - use a real screenshot when available */}
              <div className="relative bg-white dark:bg-gray-800 p-2 rounded-2xl transition-transform duration-500 transform group-hover:scale-[1.02]">
                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
                  {/* Header of the mock dashboard */}
                  <div className="bg-white dark:bg-gray-800 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  
                  {/* Content of the mock dashboard */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="h-24 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center p-4">
                        <div className="w-full space-y-2">
                          <div className="h-4 w-12 bg-blue-200 dark:bg-blue-800 rounded"></div>
                          <div className="h-6 w-20 bg-blue-300 dark:bg-blue-700 rounded-md"></div>
                          <div className="h-3 w-full bg-blue-200 dark:bg-blue-800 rounded"></div>
                        </div>
                      </div>
                      <div className="h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center p-4">
                        <div className="w-full space-y-2">
                          <div className="h-4 w-12 bg-indigo-200 dark:bg-indigo-800 rounded"></div>
                          <div className="h-6 w-20 bg-indigo-300 dark:bg-indigo-700 rounded-md"></div>
                          <div className="h-3 w-full bg-indigo-200 dark:bg-indigo-800 rounded"></div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -right-4 top-12 bg-white dark:bg-gray-800 shadow-lg rounded-full py-2 px-3 flex items-center space-x-1 transform rotate-3 animate-float">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
              <span className="text-sm font-medium">Task Completed</span>
            </div>
            <div className="absolute -left-6 bottom-12 bg-white dark:bg-gray-800 shadow-lg rounded-full py-2 px-3 flex items-center transform -rotate-6 animate-float animation-delay-1000">
              <span className="text-sm font-medium">Sprint Progress: 78%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 