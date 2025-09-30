import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {

  return (
    <div className="min-h-screen bg-zero-beige flex flex-col monstant-font">
      {/* Header */}
      <header className="bg-gray-200 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-playfair font-bold">
            <img src="/images/main-logo.png" alt="logo" className="w-[12rem] object-contain" />
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm p-12 shadow-lg animate-fade-in">
            {/* Error Icon */}
            <div className="flex justify-center mb-8">
              <div className="bg-zero-warning/10 p-6 rounded-full">
                <AlertTriangle className="h-16 w-16 text-zero-warning" />
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h1 className="text-6xl font-playfair font-bold text-zero-text mb-4">
                404
              </h1>
              <h2 className="text-2xl font-playfair font-semibold text-zero-text mb-4">
                Page Not Found
              </h2>
              <p className="text-lg font-inter text-zero-text/70 mb-6">
                Oops! The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/">
                <Button 
                  size="lg"
                  className="w-full sm:w-auto bg-zero-green text-white hover:bg-zero-green/90 text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
                >
                  <Home className="mr-3 h-5 w-5" />
                  Go Home
                </Button>
              </a>
              
              <Button 
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-zero-navy text-zero-text hover:bg-zero-navy hover:text-white text-lg px-8 py-6 font-semibold transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="mr-3 h-5 w-5" />
                Go Back
              </Button>
            </div>
          </Card>

          {/* Additional Help */}
          <Card className="mt-8 bg-white/60 backdrop-blur-sm p-6 shadow-lg">
            <h3 className="text-lg font-playfair font-semibold text-zero-text mb-4">
              Need Help?
            </h3>
            <div className="grid sm:grid-cols-1 gap-4 text-sm font-inter text-zero-text/70">
              <div>
                <strong>Looking for the listener page?</strong>
                <p>
                  <a href="/listen" className="text-zero-blue hover:underline">
                    Join as a listener →
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zero-navy text-white p-4">
        <div className="container mx-auto text-center">
          <p className="font-inter text-sm">
            © 2024 ZERO Platform. Professional Audio Streaming.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
