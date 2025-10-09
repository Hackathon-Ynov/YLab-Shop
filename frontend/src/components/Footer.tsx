import { Github } from "lucide-react";

const GITHUB_URL = "https://github.com/Eric-Philippe/Ylab-Hackathon";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 shadow-sm mt-12">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between text-gray-600 text-sm">
        <div className="flex items-center space-x-2 mb-2 md:mb-0">
          <span>YLab Hackathon</span>
          <span className="mx-2">|</span>
          <span>Version: 0.1.0</span>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
        >
          <Github className="w-4 h-4" />
          <span>Source on GitHub</span>
        </a>
      </div>
    </footer>
  );
}
