// components/DevWarningBanner.tsx
import React, { useEffect } from "react";
import { toast } from "react-hot-toast";

export const DevWarningBanner = () => {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const isProdUrl = apiUrl?.includes("onrender.com");

    if (process.env.NODE_ENV === "development" && isProdUrl) {
      toast(
        (t) => (
          <div style={{ paddingRight: "1rem" }}>
            <strong>🚨 Production API Detected</strong>
            <div style={{ marginTop: "0.5rem" }}>
              You're using the production API in local dev. Check <code>.env.local</code>.
            </div>
            <button
              style={{
                marginTop: "0.75rem",
                background: "#ffcc00",
                border: "none",
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onClick={() => toast.dismiss(t.id)}
            >
              Close
            </button>
          </div>
        ),
 {
        duration: Infinity,
        icon: "⚠️",
        position: "bottom-center",
        style: { background: "#ffcccb", color: "#000", fontWeight: "bold" },

      });
    }
  }, []);

  return null;
};

export default DevWarningBanner;