import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Lead = {
  id: string;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  preferred_language?: string | null;
  delivery_preference?: string | null;
  journey_ref?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  traveller_type?: string | null;
  adults?: number | null;
  children?: number | null;
  budget_style?: string | null;
  wellness_goal?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type AdminWorkspaceProps = {
  onLogout: () => void;
};

export default function AdminWorkspace({
  onLogout,
}: AdminWorkspaceProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadLeads() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLeads([]);
    } else {
      setLeads((data ?? []) as Lead[]);
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  useEffect(() => {
    void loadLeads();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7f2",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                color: "#47704b",
                fontWeight: 700,
              }}
            >
              CEYLON WELLNESS
            </p>

            <h1 style={{ margin: 0 }}>
              Admin Workspace
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              Traveller journeys awaiting human planning and review.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => void loadLeads()}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1px solid #bbb",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: 0,
                background: "#47704b",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <section
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "center",
              marginBottom: "22px",
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                Traveller Requests
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#777",
                }}
              >
                {leads.length} request{leads.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {loading && <p>Loading traveller requests...</p>}

          {!loading && message && (
            <div
              style={{
                padding: "14px",
                background: "#fff3f3",
                borderRadius: "12px",
              }}
            >
              <strong>Unable to load requests.</strong>
              <div style={{ marginTop: "6px" }}>{message}</div>
            </div>
          )}

          {!loading && !message && leads.length === 0 && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                background: "#f8faf6",
                borderRadius: "16px",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                No traveller requests yet
              </h3>

              <p style={{ color: "#777", marginBottom: 0 }}>
                New consented journey requests will appear here.
              </p>
            </div>
          )}

          {!loading && !message && leads.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "18px",
              }}
            >
              {leads.map((lead) => (
                <article
                  key={lead.id}
                  style={{
                    border: "1px solid #e2e7df",
                    borderRadius: "16px",
                    padding: "20px",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 5px" }}>
                        {lead.name || "Traveller"}
                      </h3>

                      <small style={{ color: "#777" }}>
                        {lead.journey_ref || "Journey request"}
                      </small>
                    </div>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background: "#edf4ea",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {lead.status || "NEW"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "18px",
                      lineHeight: 1.7,
                    }}
                  >
                    <div>
                      <strong>Language:</strong>{" "}
                      {lead.preferred_language || "—"}
                    </div>

                    <div>
                      <strong>Travel:</strong>{" "}
                      {lead.arrival_date || "—"} →{" "}
                      {lead.departure_date || "—"}
                    </div>

                    <div>
                      <strong>Travellers:</strong>{" "}
                      {lead.adults ?? "—"} adults
                      {typeof lead.children === "number"
                        ? ` · ${lead.children} children`
                        : ""}
                    </div>

                    <div>
                      <strong>Wellness:</strong>{" "}
                      {lead.wellness_goal || "—"}
                    </div>

                    <div>
                      <strong>Budget:</strong>{" "}
                      {lead.budget_style || "—"}
                    </div>
                  </div>

                  <hr
                    style={{
                      border: 0,
                      borderTop: "1px solid #eee",
                      margin: "18px 0",
                    }}
                  />

                  <div style={{ lineHeight: 1.7 }}>
                    <div>
                      <strong>Email:</strong>{" "}
                      {lead.email || "—"}
                    </div>

                    <div>
                      <strong>WhatsApp:</strong>{" "}
                      {lead.whatsapp || "—"}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      width: "100%",
                      marginTop: "18px",
                      padding: "12px",
                      border: 0,
                      borderRadius: "10px",
                      background: "#47704b",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Open Journey
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}