import React, { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import L from "leaflet"; // 👈 เพิ่มใช้ type LatLngBounds
import { GetAllNode } from "../services/defensiveService";
import type { NodeGet } from "../types/defensive";

interface OverlayItem {
  id: number;
  name: string;
  color: string;
  checked: boolean;
}

interface DateFormatter {
  (date: Date): string;
}

// ให้ component นี้ยิง node ที่เลือกออกไป + รับ bounds จาก MapView
interface OverlayListProps {
  onSelectNode?: (node: NodeGet) => void;
  mainMapBounds?: L.LatLngBounds | null;
}

const OverlayList: React.FC<OverlayListProps> = ({
  onSelectNode,
  mainMapBounds,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [nodes, setNodes] = useState<NodeGet[]>([]);
  const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeGet | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // เวลา ----------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getColorByNodeType = (nodeType?: string): string => {
    const type = (nodeType ?? "DEFAULT").toUpperCase();
    switch (type) {
      case "INTERNAL":
      case "RTARF_INTERNAL":
      case "HQ":
        return "bg-blue-500";
      case "EXTERNAL":
        return "bg-blue-600";
      case "TH_INFRA":
      case "THAILAND":
        return "bg-blue-700";
      case "OPPOSITE_INFRA":
        return "bg-purple-500";
      case "OPPOSITE_TARGET":
        return "bg-purple-600";
      default:
        return "bg-slate-500";
    }
  };

  // โหลด node จาก /nodes/ -----------------------------------
  useEffect(() => {
    const fetchNodes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await GetAllNode();
        console.log("OverlayList nodes:", data);

        setNodes(data);

        const mapped: OverlayItem[] = data.map((node, index) => ({
          id: node.id ?? index,
          name: node.name ?? `NODE-${index + 1}`,
          color: getColorByNodeType(node.node_type),
          checked: index === 0,
        }));

        setOverlayItems(mapped);

        // ถ้ามีข้อมูลให้เลือกตัวแรกเป็น default
        if (data.length > 0) {
          setSelectedNode(data[0]);
          onSelectNode?.(data[0]); // แจ้ง parent ว่าเลือก node แรก
        }
      } catch (err) {
        console.error("Error in OverlayList.fetchNodes:", err);
        setError("ไม่สามารถโหลดข้อมูล Node ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, [onSelectNode]);

  const formatDate: DateFormatter = (date) => {
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

  const formatTime: DateFormatter = (date: Date): string =>
    date.toLocaleTimeString("en-US", { hour12: false });

  const handleSelectOverlay = (itemId: number) => {
    setOverlayItems((prev) => {
      const updated = prev.map((item) => ({
        ...item,
        checked: item.id === itemId,
      }));

      const index = updated.findIndex((item) => item.id === itemId);
      if (index !== -1 && nodes[index]) {
        setSelectedNode(nodes[index]);
        onSelectNode?.(nodes[index]); // ส่ง node ที่เลือกออกไป
      }

      return updated;
    });
  };

  const displayOrDash = (value?: string | number | null): string =>
    value === undefined || value === null || value === "" ? "-" : String(value);

  // =========================
  // World Map indicator style
  // =========================
  const getWorldMarkerStyle = () => {
    if (!mainMapBounds) {
      // ตอนยังไม่รู้ bounds ใช้ค่าประมาณเดิม
      return {
        left: "72%",
        top: "40%",
        width: "25px",
        height: "25px",
      };
    }

    const center = mainMapBounds.getCenter();
    const lat = center.lat; // -90 .. 90
    const lng = center.lng; // -180 .. 180

    // สมมติ world.svg เป็นแผนที่ equirectangular
    const xPercent = ((lng + 180) / 360) * 100; // -180..180 -> 0..100
    const yPercent = ((90 - lat) / 180) * 100;  // 90..-90 -> 0..100

    return {
      left: `calc(${xPercent}% - 12.5px)`, // 25/2
      top: `calc(${yPercent}% - 12.5px)`,
      width: "25px",
      height: "25px",
    };
  };

  const getWorldGlowStyle = () => {
    if (!mainMapBounds) {
      return {
        left: "calc(73% - 3px)",
        top: "calc(48% - 3px)",
        width: "12px",
        height: "12px",
      };
    }

    const center = mainMapBounds.getCenter();
    const lat = center.lat;
    const lng = center.lng;

    const xPercent = ((lng + 180) / 360) * 100;
    const yPercent = ((90 - lat) / 180) * 100;

    return {
      left: `calc(${xPercent}% - 6px)`, // 12/2
      top: `calc(${yPercent}% - 6px)`,
      width: "12px",
      height: "12px",
    };
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-black text-white p-1 border-r-2 border-black flex flex-col">
      {/* Logo + DateTime */}
      <div className="bg-black rounded-lg p-2 mb-2 border border-black">
        <div className="flex justify-center mb-1">
          <div className="w-30 h-12 flex items-center justify-center">
            <div className="text-center mt-6">
              <img
                src="img/rtarf.png"
                alt="RTARF Logo"
                className="w-32 h-auto mx-auto object-contain animate-flip-rotate"
              />
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <div className="text-[15px] text-gray-300 font-bold flex items-center justify-center gap-1">
            <Globe className="w-4 h-4" />
            {formatDate(currentTime)}
          </div>
          <div className="text-sm font-mono font-bold text-white">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* World map (เลื่อนตาม MapView) */}
      <div className="bg-slate-700 rounded p-1 relative overflow-hidden border-8 border-gray-500 mb-1">
        <img
          src="img/world.svg"
          alt="World Map"
          className="w-full h-24 object-contain rounded"
        />

        {/* กรอบสี่เหลี่ยมตาม center ของ MapView */}
        <div
          className="absolute border-3 border-green-500 animate-pulse"
          style={getWorldMarkerStyle()}
        ></div>

        {/* จุดเรืองแสงตรงกลางกรอบ */}
        <div
          className="absolute rounded-full bg-green-400 opacity-50 blur-sm"
          style={getWorldGlowStyle()}
        ></div>
      </div>

      {/* OVERLAY LIST */}
      <div className="bg-black rounded-lg p-2 mb-2 border-8 border-gray-500 flex-shrink-0 w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-gray-600 pb-1 flex justify-center">
          OVERLAY LIST
        </div>

        {/* แถวเล็กใต้หัว */}
        <div className="text-[13px] font-semibold text-white mb-1 flex justify-between items-center">
          {loading && (
            <span className="text-[10px] text-gray-400">
              กำลังโหลดข้อมูล Node...
            </span>
          )}
        </div>

        {/* error */}
        {error && (
          <div className="text-[11px] text-red-400 mb-1">{error}</div>
        )}

        {/* ไม่มีข้อมูล */}
        {!loading && !error && overlayItems.length === 0 && (
          <div className="text-[12px] text-gray-400 mb-1">
            ไม่มีข้อมูล Node จากฐานข้อมูล
          </div>
        )}

        {/* รายการ overlay */}
        <div className="space-y-1 max-h-29.5 overflow-y-auto mt-1 custom-scroll">
          {overlayItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectOverlay(item.id)}
              className={`w-full flex items-center gap-2 px-1.5 py-1 text-left text-[11px] rounded border ${
                item.checked
                  ? "border-green-400 bg-slate-800"
                  : "border-gray-700 bg-slate-900/60 hover:bg-slate-800"
              } transition-colors`}
            >
              {/* กล่อง check */}
              <div className="flex items-center justify-center w-3 h-3 border border-gray-400 rounded-[2px] bg-black">
                {item.checked && <Check className="w-2 h-2 text-green-400" />}
              </div>

              {/* chip สี overlay */}
              <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />

              {/* ชื่อ overlay */}
              <span className="text-[12px] text-gray-300 flex-1 font-bold truncate">
                {item.name}
              </span>
            </button>
          ))}
        </div>

        {/* ปุ่ม control ล่างสุด */}
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-600">
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>🔍</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>📁</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>💾</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>🗑️</span>
          </button>
        </div>
      </div>

      {/* SITREP */}
      <div className="bg-black rounded-lg p-2 border-8 border-gray-500 flex-1 overflow-hidden w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-black pb-2 flex justify-center">
          SITREP
        </div>

        <div className="bg-cyan-50 rounded p-2 space-y-1.5 text-[15px] h-full overflow-y-auto">
          {selectedNode ? (
            <>
              <div>
                <div className="text-black font-semibold mb-0.5">
                  H/W Information
                </div>
                <div className="space-y-0 text-black ml-1 text-[12px]">
                  <div>
                    • Name:{" "}
                    <span className="text-blue-700">
                      {displayOrDash(selectedNode.name)}
                    </span>
                  </div>
                  <div>
                    • Location:{" "}
                    <span className="text-blue-700">
                      {displayOrDash(selectedNode.latitude)},{" "}
                      {displayOrDash(selectedNode.longitude)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-black font-semibold mb-0.5">
                  Network Information
                </div>
                <div className="space-y-0 text-black ml-1 text-[12px]">
                  <div>• IP: {displayOrDash(selectedNode.ip_address)}</div>
                  <div>
                    • G/W:{" "}
                    {selectedNode.additional_ips &&
                    selectedNode.additional_ips.length > 0
                      ? selectedNode.additional_ips.join(", ")
                      : "-"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-[12px] text-gray-700">
              ยังไม่มีข้อมูล Node ที่ใช้แสดง (กรุณาเพิ่ม Node ในระบบ หรือรอให้โหลดข้อมูลสำเร็จ)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverlayList;
