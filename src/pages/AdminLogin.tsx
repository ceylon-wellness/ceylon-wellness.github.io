import { FormEvent, useState } from "react";
import { supabase } from "../supabaseClient";

type AdminLoginProps = {
  onLogin: () => void;
};

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user) {
        setMessage("Login failed. Please try again.");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        setMessage("This account does not have Ceylon Wellness admin access.");
        return;
      }

      onLogin();
    } catch {
      setMessage("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f5f7f2",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          padding: "32px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontWeight: 700,
            color: "#47704b",
          }}
        >
          CEYLON WELLNESS
        </p>

        <h1 style={{ margin: "0 0 8px" }}>Admin Workspace</h1>

        <p style={{ margin: "0 0 28px", color: "#666" }}>
          Secure access for authorised Ceylon Wellness planners.
        </p>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="admin-email"
            style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}
          >
            Email
          </label>

          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "18px",
              border: "1px solid #ccc",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          />

          <label
            htmlFor="admin-password"
            style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}
          >
            Password
          </label>

          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "18px",
              border: "1px solid #ccc",
              borderRadius: "12px",
              fontSize: "16px",
            }}
          />

          {message && (
            <p
              role="alert"
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: "#fff3f3",
                marginBottom: "18px",
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: 0,
              borderRadius: "12px",
              background: "#47704b",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign in securely"}
          </button>
        </form>

        <p
          style={{
            margin: "22px 0 0",
            fontSize: "13px",
            color: "#777",
            textAlign: "center",
          }}
        >
          Authorised Ceylon Wellness team members only.
        </p>
      </section>
    </main>
  );
}