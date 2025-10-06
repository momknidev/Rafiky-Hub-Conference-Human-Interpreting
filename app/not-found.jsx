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

       
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
