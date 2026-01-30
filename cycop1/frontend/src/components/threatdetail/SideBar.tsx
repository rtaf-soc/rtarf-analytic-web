import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Activity, 
  LayoutDashboard, 
  Map, 
  ShieldAlert, 
  FileText, 
  Settings,
  X 
} from "lucide-react";

// ✅ เพิ่ม Interface Props เพื่อรับค่าจาก Parent Component
interface SidebarProps {
  isOpen?: boolean;     
  onClose?: () => void; 
  className?: string;   
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen = true, // Default เป็น true (เปิดตลอด) สำหรับ Desktop
  onClose,
  className = ""
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => date.toLocaleTimeString("en-US", { hour12: false });

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/bangkok" },
    { label: "Incident Detail", icon: ShieldAlert, path: "/threatdetail" },
  ];

  return (
    <>
      {/* Mobile Overlay: ฉากหลังสีดำจางๆ (แสดงเฉพาะตอนเปิดบนมือถือ) */}
      <div 
        className={`fixed inset-0 bg-black/80 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50 
          h-full w-64 bg-slate-950 border-r border-slate-900 
          flex flex-col shrink-0 transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} 
          ${className}
        `}
      >
        {/* Header Section */}
        <div className="p-3 border-b border-slate-900 relative">
          
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>

          <div className="bg-black rounded-lg p-2 mb-2 border border-slate-800">
            <div className="flex justify-center mb-1">
              <div className="w-30 h-12 flex items-center justify-center">
                <div className="text-center mt-6">
                  <img src="img/rtarf.png" alt="RTARF Logo" className="object-contain h-20" />
                </div>
              </div>
            </div>
            <div className="text-center mt-8">
              <div className="text-[15px] text-gray-400 font-bold">{formatDate(currentTime)}</div>
              <div className="text-sm font-mono font-bold text-white">{formatTime(currentTime)}</div>
            </div>
          </div>
        </div>

        {/* Navigation Section (Uncommented & Active State Logic) */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname.includes(item.path) && item.path !== "#";

            return (
              <div
                key={idx}
                onClick={() => {
                  if (item.path !== "#") {
                    navigate(item.path);
                    if (onClose) onClose(); 
                  }
                }}
                className={`p-3 rounded-md cursor-pointer flex items-center space-x-3 transition-colors ${
                  isActive
                    ? "bg-blue-900/50 text-blue-100 border border-blue-800 shadow-md shadow-blue-900/20"
                    : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <item.icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};