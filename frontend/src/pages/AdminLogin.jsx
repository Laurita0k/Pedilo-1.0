import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { Lock, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@pedilo.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bienvenido");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Error al ingresar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md" data-testid="admin-login-page">
        <button
          onClick={() => navigate("/")}
          className="mb-4 text-sm text-gray-500 font-medium flex items-center gap-1 hover:text-gray-800"
          data-testid="back-to-shop"
        >
          <ArrowLeft size={14} /> Volver al menú
        </button>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Lock size={20} />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-gray-900">Panel Pedilo</h1>
              <p className="text-xs text-gray-500">Acceso del dueño</p>
            </div>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                Email
              </label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                Contraseña
              </label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="mt-2 h-12 rounded-full bg-primary text-white font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
