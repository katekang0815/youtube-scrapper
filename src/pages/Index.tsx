
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Play, FileText, Zap, Globe, Shield, Plus, Users, Database, Edit, BarChart3, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const exampleProjects = [
    {
      icon: FileText,
      title: "Hacker News top 100",
      description: "Browse and analyze trending tech stories"
    },
    {
      icon: BarChart3,
      title: "Social media dashboard",
      description: "Track your social media analytics"
    },
    {
      icon: Edit,
      title: "Markdown editor",
      description: "Write and preview markdown content"
    },
    {
      icon: Receipt,
      title: "Bill splitter",
      description: "Split expenses with friends easily"
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, just navigate to auth - in a real app this would handle the search
      window.location.href = '/auth';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Main Content */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Build something{" "}
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                ❤️ Lovable
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Create apps and websites by chatting with AI
            </p>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-8">
              <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
                <Input
                  type="text"
                  placeholder="Ask Lovable to create a prototype..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white placeholder-gray-400 text-lg px-4 py-3 focus:ring-0 focus:outline-none"
                />
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                  </Button>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-300 border-gray-600">
                    <Users className="w-3 h-3 mr-1" />
                    Workspace
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-900/30 text-emerald-300 border-emerald-700">
                    <Database className="w-3 h-3 mr-1" />
                    Supabase
                  </Badge>
                </div>
              </div>
            </form>

            {/* Example Projects */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {exampleProjects.map((project, index) => (
                <Card 
                  key={index} 
                  className="bg-gray-800/30 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800/50 transition-all duration-300 cursor-pointer group"
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:bg-gray-600/50 transition-colors">
                      <project.icon className="w-5 h-5 text-gray-300" />
                    </div>
                    <h3 className="text-white font-medium text-sm mb-1">
                      {project.title}
                    </h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {project.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Get Started Free
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-6 text-lg rounded-full border-2 border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:border-gray-500"
              >
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything you need to build with AI
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Powerful tools to create, deploy, and scale your applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Search,
              title: "AI-Powered Creation",
              description: "Describe what you want to build and watch it come to life"
            },
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "Built for speed with modern web technologies"
            },
            {
              icon: Globe,
              title: "Deploy Anywhere",
              description: "One-click deployment to popular hosting platforms"
            }
          ].map((feature, index) => (
            <Card key={index} className="bg-gray-800/20 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-orange-400" />
                </div>
                <CardTitle className="text-xl font-semibold text-white">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/50 backdrop-blur-sm py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Trend Scrapper. Made with ❤️ for creators and developers.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
