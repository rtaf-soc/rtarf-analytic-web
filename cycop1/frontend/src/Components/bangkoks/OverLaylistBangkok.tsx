import { useState, useEffect } from "react";

const OverlayListBangkok = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date): string => {
    const days: string[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months: string[] = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    return `${days[date.getDay()]} ${date.getDate()} ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  return (
    <div className="fixed left-0 top-0 h-auto w-60 bg-black text-white p-1 border-r-2 border-black flex flex-col">
      {/* Logo and DateTime */}
      <div className="bg-black rounded-lg p-2 mb-2 border border-black">
        <div className="flex justify-center mb-1">
          <div className="w-30 h-12 flex items-center justify-center">
            <div className="text-center mt-6">
              <img src="img/rtarf.png" alt="RTARF Logo" />
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <div className="text-[15px] text-gray-300 font-bold">
            {formatDate(currentTime)}
          </div>
          <div className="text-sm font-mono font-bold text-white">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* World Map */}
      <div className="bg-slate-700 rounded p-1 relative overflow-hidden border-8 border-gray-500 mb-1">
        <img
          src="img/world.svg"
          alt="World Map"
          className="w-full h-24 object-contain rounded"
        />

        {/* Thailand Marker */}
        <div
          className="absolute border-3 border-green-500 animate-pulse"
          style={{
            left: "72%",
            top: "40%",
            width: "25px",
            height: "25px",
          }}
        />

        {/* Glow Effect */}
        <div
          className="absolute rounded-full bg-green-400 opacity-50 blur-sm"
          style={{
            left: "calc(73% - 3px)",
            top: "calc(48% - 3px)",
            width: "12px",
            height: "12px",
          }}
        />
      </div>

    </div>
  );
};

export default OverlayListBangkok;
