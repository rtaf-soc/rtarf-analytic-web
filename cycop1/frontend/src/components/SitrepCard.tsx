import React from "react";

const Sitrep: React.FC = () => {
    return (
        <>
            {/* SITREP */}
            <div className="bg-black rounded-lg p-2 border-8 border-gray-500 flex-1 overflow-hidden w-57">
                <div className="text-[15px] font-bold mb-1.5 text-white border-b border-black pb-2 flex justify-center ">
                    SITREP
                </div>

                <div className="bg-cyan-50 rounded p-2 space-y-1.5 text-[15px] h-full overflow-y-auto">
                    {/* H/W Information */}
                    <div>
                        <div className="text-black font-semibold mb-0.5">
                            H/W Information
                        </div>
                        <div className="space-y-0 text-black ml-1 text-[12px]">
                            <div>
                                • Name: DESKTOP <span className="text-blue-700">-AUH446P</span>
                            </div>
                            <div>
                                • Location:{" "}
                                <span className="text-blue-700">13.7563, 100.5018</span>
                            </div>
                        </div>
                    </div>

                    {/* Network Information */}
                    <div>
                        <div className="text-black font-semibold mb-0.5">
                            Network Information
                        </div>
                        <div className="space-y-0 text-black ml-1 text-[12px]">
                            <div>• IP: 192.168.1.14/26</div>
                            <div>• G/W: 192.168.101.1</div>
                        </div>
                    </div>

                    {/* OwnerIn formation*/}
                    <div>
                        <div className="text-black font-semibold mb-0.5">
                            Owner Information
                        </div>
                        <div className="space-y-0 text-black ml-1 text-[12px]">
                            <div>• Owner name: Unknown</div>
                        </div>
                    </div>

                    {/* Used Application */}
                    <div>
                        <div className="text-black font-semibold mb-0.5">
                            Used Application
                        </div>
                        <div className="space-y-0 text-black ml-1 text-[12px]">
                            <div>• Slack Messenger v4.27.154</div>
                            <div>• Word 97/PC v6.32.10.1</div>
                            <div>• Microsoft Excel 2019 v1.23.41</div>
                            <div className="text-blue-400">+ 32 applications</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Sitrep