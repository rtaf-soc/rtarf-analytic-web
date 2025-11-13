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
    <div className="fixed left-0 top-0 h-screen w-60 bg-black text-white p-1 border-r-2 border-black flex flex-col">
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

      {/* SITREP */}
      <div className="bg-black rounded-lg p-0 border-black flex-1 overflow-hidden">
        <div className="bg-black rounded p-0 space-y-1.5 text-[15px] h-full overflow-y-auto">
          {/* H/W Information */}
          <div>
            <div className="text-black font-semibold mb-0.5"></div>
            <div className="space-y-0 text-black ml-1 text-[12px]">
              <div></div>
              <div></div>
            </div>
          </div>

          {/* Network Information */}
          <div>
            <div className="text-black font-semibold mb-0.5"></div>
            <div className="space-y-0 text-black ml-1 text-[12px]"></div>
          </div>

          {/* Owner Information */}
          <div>
            <div className="text-black font-semibold mb-0.5"></div>
            <div className="space-y-0 text-black ml-1 text-[12px]"></div>
          </div>

          {/* Used Application */}
          <div>
            <div className="text-black font-semibold mb-0.5"></div>
            <div className="space-y-0 text-black ml-1 text-[12px]"></div>
          </div>
        </div>
      </div>

      {/* Threat Alert List */}
      <div className="bg-yellow-600 rounded-lg p-3 border-8 border-gray-500 flex-1 overflow-hidden">
        <div className="text-[15px] mb-2 text-white flex items-center gap-1 justify-center font-bold">
          <img src="../../public/img/บก.ทท.png" alt="" width={30} height={30}/>
          บก.ทท
        </div>

        <div className="space-y-1 overflow-y-auto h-full pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {/* Sample threat alerts */}
          {[
            {
              severity: "high",
              title: "Suspicious .NET Behavior",
              code: "50104",
            },
            {
              severity: "high",
              title: "Malicious Process Creation",
              code: "49887",
            },
            {
              severity: "high",
              title: "Suspicious .NET Behavior",
              code: "50104",
            },
            {
              severity: "high",
              title: "Unauthorized Access Attempt",
              code: "48562",
            },
            {
              severity: "high",
              title: "Network Anomaly Detected",
              code: "51203",
            },
            { severity: "high", title: "Failed Login Attempt", code: "47891" },
            {
              severity: "high",
              title: "Data Exfiltration Detected",
              code: "52104",
            },
            { severity: "high", title: "Port Scan Activity", code: "46732" },
          ].map((alert, idx) => {
            const severityColors: { [key: string]: string } = {
              critical: "bg-red-500",
              high: "bg-orange-500",
              medium: "bg-yellow-500",
              low: "bg-blue-500",
            };

            return (
              <div
                key={idx}
                className="flex items-center gap-2 bg-black group relative overflow-hidden"
              >

                {/* Severity color bar */}
                <div
                  className={`${
                    severityColors[alert.severity]
                  } w-4 h-8 flex-shrink-0 relative `}
                >
                  <div
                    className={`absolute inset-0 ${
                      severityColors[alert.severity]
                    } blur-md opacity-0 `}
                  ></div>
                </div>

                {/* Alert info */}
                <div className="flex flex-col flex-1 min-w-0 text-[13px] leading-tight z-10">
                  <span
                    className="text-white font-semibold truncate"
                    title={alert.title}
                  >
                    {alert.title}
                  </span>
                  <span
                    className="text-gray-400 font-mono text-[11px] truncate "
                    title={alert.code}
                  >
                    {alert.code}
                  </span>
                </div>

                {/* Pulse indicator */}
                <div className="flex-shrink-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      severityColors[alert.severity]
                    } animate-pulse`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OverlayListBangkok;
