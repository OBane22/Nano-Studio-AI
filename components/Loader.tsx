
import React from 'react';

const loadingMessages = [
  "Warming up the AI's creative circuits...",
  "Teaching pixels new tricks...",
  "Applying digital magic...",
  "Reticulating splines...",
  "Almost there, perfecting the details...",
  "Generating masterpiece...",
];

const Loader: React.FC<{ message?: string }> = ({ message }) => {
  const [displayMessage, setDisplayMessage] = React.useState(loadingMessages[0]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDisplayMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0A192F]/80 backdrop-blur-sm flex flex-col justify-center items-center z-50">
      <div className="w-16 h-16 border-4 border-t-4 border-[#233554] border-t-[#64FFDA] rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-medium text-[#ccd6f6]">{message || displayMessage}</p>
    </div>
  );
};

export default Loader;