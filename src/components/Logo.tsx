import Link from "next/link";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <Link 
      href="/" 
      className={`flex items-center gap-2 group ${className}`}
    >
      <div className="relative flex items-center justify-center w-9 h-9 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
        <svg 
          className="w-5 h-5 text-white transform group-hover:scale-110 transition-transform duration-300" 
          fill="currentColor" 
          viewBox="0 0 20 20" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            fillRule="evenodd" 
            d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" 
            clipRule="evenodd" 
          />
        </svg>
        <div className="absolute -right-6 -bottom-6 w-10 h-10 bg-blue-400 rounded-full blur-xl opacity-70"></div>
      </div>
      <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 tracking-tight group-hover:tracking-wide transition-all duration-300">
        TaskFlow
      </span>
    </Link>
  );
} 