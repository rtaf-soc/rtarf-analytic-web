import React, { useState } from "react";
import { Shield, MapPin, Network, Plus, X } from "lucide-react";
import { createNode, type NodePayload } from "../services/defensiveService";

const CreateNode: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    node_type: "",
    latitude: "",
    longitude: "",
    ip_address: "",
    additional_ips: [""],
    network_metadata: "",
    map_scope:""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleAdditionalIpChange = (index: number, value: string) => {
    const newIps = [...formData.additional_ips];
    newIps[index] = value;
    setFormData(prev => ({ ...prev, additional_ips: newIps }));
  };

  const addIpField = () => {
    setFormData(prev => ({ ...prev, additional_ips: [...prev.additional_ips, ""] }));
  };

  const removeIpField = (index: number) => {
    if (formData.additional_ips.length > 1) {
      const newIps = formData.additional_ips.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, additional_ips: newIps }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "กรุณากรอกชื่อโหนด";
    if (!formData.node_type) newErrors.node_type = "กรุณาเลือกประเภทโหนด";
    if (!formData.latitude.trim()) newErrors.latitude = "กรุณากรอกพิกัดละติจูด";
    if (!formData.longitude.trim()) newErrors.longitude = "กรุณากรอกพิกัดลองจิจูด";
    
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    if (formData.latitude && (isNaN(lat) || lat < -90 || lat > 90)) {
      newErrors.latitude = "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90";
    }
    if (formData.longitude && (isNaN(lon) || lon < -180 || lon > 180)) {
      newErrors.longitude = "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (validate()) {
    try {
      let parsedMetadata: Record<string, any> | undefined = undefined;

      if (formData.network_metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(formData.network_metadata);
        } catch (error) {
          alert("รูปแบบข้อมูลเครือข่ายไม่ถูกต้อง ต้องเป็น JSON ที่ถูกต้อง เช่น {\"bandwidth\": \"1Gbps\"}");
          return;
        }
      }

      const submissionData: NodePayload = {
        name: formData.name,
        description: formData.description || undefined,
        node_type: formData.node_type,
        latitude: formData.latitude,
        longitude: formData.longitude,
        ip_address: formData.ip_address || undefined,
        additional_ips: formData.additional_ips.filter(ip => ip.trim() !== ""),
        network_metadata: parsedMetadata, // ✅ now an object
        map_scope: formData.map_scope,
      };
      
      const result = await createNode(submissionData);
      console.log("Node created:", result);
      alert("สร้างโหนดสำเร็จ!");
    } catch (error) {
      console.error("Failed to create node:", error);
      alert("เกิดข้อผิดพลาดในการสร้างโหนด");
    }
  }
};

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-linear-to-r from-cyan-500/20 to-blue-500/20 blur-3xl"></div>
          <div className="relative bg-slate-800/50 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 tracking-wider">NODE CREATION</h1>
                <p className="text-slate-400 text-sm mt-1">MILITARY CYBER NETWORK SYSTEM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-800/80 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-sm">
            {/* Name */}
            <div className="mb-6">
              <label className="block text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                ชื่อของโหนด <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                placeholder="Enter node name"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                คำอธิบาย
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                placeholder="Enter description (optional)"
              />
            </div>

            {/* Node Type */}
            <div className="mb-6">
              <label className="block text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                ประเภทของโหนด <span className="text-red-400">*</span>
              </label>
              <select
                name="node_type"
                value={formData.node_type}
                onChange={handleChange}
                className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              >
                <option value="">Select node type</option>
                <option value="command">Command Center</option>
                <option value="relay">Relay Station</option>
                <option value="sensor">Sensor Node</option>
                <option value="gateway">Gateway</option>
                <option value="defense">Defense Point</option>
              </select>
              {errors.node_type && <p className="text-red-400 text-sm mt-1">{errors.node_type}</p>}
            </div>

            {/* Map Scope */}
            <div className="mb-6">
              <label className="block text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                แผนที่ของโหนด <span className="text-red-400">*</span>
              </label>
              <select
                name="map_scope"
                value={formData.map_scope}
                onChange={handleChange}
                className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              >
                <option value="">Select Map Scope</option>
                <option value="global">Global</option>
                <option value="bangkok">Bangkok</option>
              </select>
              {errors.map_scope && <p className="text-red-400 text-sm mt-1">{errors.map_scope}</p>}
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="flex items-center text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                  <MapPin className="w-4 h-4 mr-1" />
                  พิกัดละติจูด <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  placeholder="13.7563"
                />
                {errors.latitude && <p className="text-red-400 text-sm mt-1">{errors.latitude}</p>}
              </div>
              <div>
                <label className="flex items-center text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                  <MapPin className="w-4 h-4 mr-1" />
                  พิกัดลองจิจูด <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  placeholder="100.5018"
                />
                {errors.longitude && <p className="text-red-400 text-sm mt-1">{errors.longitude}</p>}
              </div>
            </div>

            {/* Primary IP */}
            <div className="mb-6">
              <label className="flex items-center text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                <Network className="w-4 h-4 mr-1" />
                IP Address หลัก
              </label>
              <input
                type="text"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                placeholder="192.168.1.1"
              />
            </div>

            {/* Additional IPs */}
            <div className="mb-6">
              <label className="flex items-center text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                <Network className="w-4 h-4 mr-1" />
                IP Addresses เพิ่มเติม
              </label>
              <div className="space-y-3">
                {formData.additional_ips.map((ip, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={ip}
                      onChange={(e) => handleAdditionalIpChange(index, e.target.value)}
                      className="flex-1 bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                      placeholder={`Additional IP ${index + 1}`}
                    />
                    {formData.additional_ips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIpField(index)}
                        className="px-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded hover:bg-red-500/30 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addIpField}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded hover:bg-cyan-500/30 transition-all text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                เพิ่ม IP
              </button>
            </div>

            {/* Network Metadata */}
            <div>
              <label className="block text-cyan-400 text-sm font-semibold mb-2 tracking-wide">
                ข้อมูลเครือข่ายเพิ่มเติม
              </label>
              <textarea
                name="network_metadata"
                value={formData.network_metadata}
                onChange={handleChange}
                rows={3}
                className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 rounded px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none font-mono text-sm"
                placeholder='{"bandwidth": "1Gbps", "protocol": "TCP/IP"}'
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all duration-300 tracking-wider text-lg"
          >
            CREATE NODE
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm font-mono">SYSTEM STATUS: OPERATIONAL</p>
        </div>
      </div>
    </div>
  );
};

export default CreateNode;