import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

export default function App() {
  const [apuestas, setApuestas] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const BANKROLL_INICIAL = 900;

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: ap } = await supabase
      .from("apuestas")
      .select("*")
      .order("registrada_en", { ascending: true });

    const { data: pred } = await supabase
      .from("predicciones")
      .select("*")
      .order("generado_en", { ascending: false })
      .limit(20);

    setApuestas(ap || []);
    setPredicciones(pred || []);
    setLoading(false);
  }

  // Métricas calculadas
  const totalApostado = apuestas.reduce((s, a) => s + (a.stake || 0), 0);
  const gananciaNeta = apuestas.reduce((s, a) => s + (a.ganancia_neta || 0), 0);
  const ganadas = apuestas.filter(a => a.resultado === "ganada").length;
  const perdidas = apuestas.filter(a => a.resultado === "perdida").length;
  const total = apuestas.length;
  const winrate = total > 0 ? (ganadas / total * 100).toFixed(1) : 0;
  const yield_ = totalApostado > 0 ? (gananciaNeta / totalApostado * 100).toFixed(2) : 0;
  const roi = (gananciaNeta / BANKROLL_INICIAL * 100).toFixed(2);
  const bankrollActual = BANKROLL_INICIAL + gananciaNeta;
  const stakeActual = (bankrollActual * 0.02).toFixed(2);

  // Datos para el gráfico de bankroll
  let saldo = BANKROLL_INICIAL;
  const graficoBankroll = apuestas.map((a, i) => {
    saldo += (a.ganancia_neta || 0);
    return {
      name: `#${i + 1}`,
      bankroll: parseFloat(saldo.toFixed(2))
    };
  });

  const styles = {
    app: { fontFamily: "system-ui, sans-serif", background: "#0f0f0f", minHeight: "100vh", color: "#e0e0e0", padding: "0" },
    header: { background: "#1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2a2a4a" },
    logo: { fontSize: "20px", fontWeight: "700", color: "#7c6af7" },
    tabs: { display: "flex", gap: "8px", padding: "16px 24px 0" },
    tab: (active) => ({ padding: "8px 18px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", background: active ? "#1e1e3a" : "transparent", color: active ? "#7c6af7" : "#888", borderBottom: active ? "2px solid #7c6af7" : "2px solid transparent" }),
    content: { padding: "24px" },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" },
    card: { background: "#1e1e3a", borderRadius: "12px", padding: "16px 20px", border: "1px solid #2a2a4a" },
    label: { fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" },
    value: { fontSize: "24px", fontWeight: "600", margin: "0" },
    sub: { fontSize: "12px", color: "#888", margin: "4px 0 0" },
    pos: { color: "#4ade80" },
    neg: { color: "#f87171" },
    neu: { color: "#888" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
    th: { textAlign: "left", padding: "10px 12px", color: "#888", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #2a2a4a" },
    td: { padding: "10px 12px", borderBottom: "1px solid #1a1a2e", color: "#e0e0e0" },
    badge: (tipo) => ({ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", background: tipo === "ganada" ? "#14532d" : tipo === "perdida" ? "#450a0a" : tipo === "pendiente" ? "#1e3a5f" : "#2a2a2a", color: tipo === "ganada" ? "#4ade80" : tipo === "perdida" ? "#f87171" : tipo === "pendiente" ? "#60a5fa" : "#888" }),
    evBadge: (ev) => ({ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", background: ev > 0.05 ? "#14532d" : "#450a0a", color: ev > 0.05 ? "#4ade80" : "#f87171" }),
    btn: { background: "#7c6af7", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500" },
    input: { background: "#0f0f0f", border: "1px solid #2a2a4a", borderRadius: "8px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", width: "100%", boxSizing: "border-box" },
  };

  // Formulario nueva apuesta
  const [form, setForm] = useState({ partido: "", mercado: "1X2", seleccion: "local", cuota: "", stake: stakeActual, ev: "", resultado: "pendiente", casa: "Betano" });

  async function guardarApuesta() {
    if (!form.partido || !form.cuota) return alert("Completá partido y cuota");
    const { error } = await supabase.from("apuestas").insert({
      mercado: form.mercado,
      seleccion: form.seleccion,
      cuota: parseFloat(form.cuota),
      stake: parseFloat(form.stake),
      ev: parseFloat(form.ev) || null,
      resultado: form.resultado,
      casa: form.casa,
      ganancia_neta: form.resultado === "ganada" ? parseFloat(form.stake) * (parseFloat(form.cuota) - 1) : form.resultado === "perdida" ? -parseFloat(form.stake) : 0,
      notas: form.partido,
    });
    if (error) { alert("Error: " + error.message); return; }
    alert("Apuesta guardada");
    cargarDatos();
  }

  if (loading) return <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#7c6af7" }}>Cargando EdgeBet...</div>;

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <span style={styles.logo}>⚡ EdgeBet Analytics</span>
        <span style={{ fontSize: "13px", color: "#888" }}>Bankroll: <span style={{ color: "#4ade80", fontWeight: "600" }}>S/. {bankrollActual.toFixed(2)}</span></span>
      </div>

      <div style={styles.tabs}>
        {["dashboard", "apuestas", "predicciones", "nueva"].map(t => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
            {t === "dashboard" ? "📊 Dashboard" : t === "apuestas" ? "📋 Historial" : t === "predicciones" ? "🤖 Predicciones" : "➕ Nueva apuesta"}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {tab === "dashboard" && (
          <>
            <div style={styles.grid4}>
              <div style={styles.card}><p style={styles.label}>Bankroll</p><p style={{ ...styles.value, color: "#7c6af7" }}>S/. {bankrollActual.toFixed(0)}</p><p style={styles.sub}>Stake sugerido: S/. {stakeActual}</p></div>
              <div style={styles.card}><p style={styles.label}>Yield</p><p style={{ ...styles.value, ...(yield_ >= 0 ? styles.pos : styles.neg) }}>{yield_ >= 0 ? "+" : ""}{yield_}%</p><p style={styles.sub}>Sobre stakes totales</p></div>
              <div style={styles.card}><p style={styles.label}>ROI</p><p style={{ ...styles.value, ...(roi >= 0 ? styles.pos : styles.neg) }}>{roi >= 0 ? "+" : ""}{roi}%</p><p style={styles.sub}>Sobre bankroll inicial</p></div>
              <div style={styles.card}><p style={styles.label}>Winrate</p><p style={styles.value}>{winrate}%</p><p style={styles.sub}>{ganadas}G / {perdidas}P / {total - ganadas - perdidas} pend.</p></div>
            </div>

            <div style={styles.card}>
              <p style={{ ...styles.label, marginBottom: "16px" }}>Evolución del bankroll</p>
              {graficoBankroll.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={graficoBankroll}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="name" stroke="#888" fontSize={11} />
                    <YAxis stroke="#888" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#1e1e3a", border: "1px solid #2a2a4a", borderRadius: "8px" }} />
                    <Line type="monotone" dataKey="bankroll" stroke="#7c6af7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>Registrá apuestas para ver la evolución del bankroll</p>}
            </div>
          </>
        )}

        {tab === "apuestas" && (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Partido</th><th style={styles.th}>Mercado</th><th style={styles.th}>Cuota</th><th style={styles.th}>Stake</th><th style={styles.th}>EV</th><th style={styles.th}>Resultado</th><th style={styles.th}>G/P</th></tr></thead>
              <tbody>
                {apuestas.length === 0 ? <tr><td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "#888" }}>Sin apuestas registradas</td></tr> :
                  apuestas.slice().reverse().map(a => (
                    <tr key={a.id}>
                      <td style={styles.td}>{a.notas || "—"}</td>
                      <td style={styles.td}>{a.mercado}</td>
                      <td style={styles.td}>{a.cuota}</td>
                      <td style={styles.td}>S/. {a.stake}</td>
                      <td style={styles.td}>{a.ev ? <span style={styles.evBadge(a.ev)}>{a.ev > 0 ? "+" : ""}{(a.ev * 100).toFixed(1)}%</span> : "—"}</td>
                      <td style={styles.td}><span style={styles.badge(a.resultado)}>{a.resultado}</span></td>
                      <td style={{ ...styles.td, ...(a.ganancia_neta >= 0 ? styles.pos : styles.neg) }}>{a.ganancia_neta >= 0 ? "+" : ""}S/. {(a.ganancia_neta || 0).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "predicciones" && (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Partido ID</th><th style={styles.th}>Local</th><th style={styles.th}>Empate</th><th style={styles.th}>Visita</th><th style={styles.th}>Over 2.5</th><th style={styles.th}>Confianza</th><th style={styles.th}>Modelo</th></tr></thead>
              <tbody>
                {predicciones.length === 0 ? <tr><td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "#888" }}>Sin predicciones generadas</td></tr> :
                  predicciones.map(p => (
                    <tr key={p.id}>
                      <td style={styles.td}>#{p.partido_id}</td>
                      <td style={{ ...styles.td, ...(p.ev_local > 0.05 ? styles.pos : styles.neu) }}>{(p.prob_local * 100).toFixed(1)}% {p.ev_local > 0.05 ? "✓" : ""}</td>
                      <td style={{ ...styles.td, ...(p.ev_empate > 0.05 ? styles.pos : styles.neu) }}>{(p.prob_empate * 100).toFixed(1)}% {p.ev_empate > 0.05 ? "✓" : ""}</td>
                      <td style={{ ...styles.td, ...(p.ev_visita > 0.05 ? styles.pos : styles.neu) }}>{(p.prob_visita * 100).toFixed(1)}% {p.ev_visita > 0.05 ? "✓" : ""}</td>
                      <td style={{ ...styles.td, ...(p.ev_over25 > 0.05 ? styles.pos : styles.neu) }}>{(p.prob_over25 * 100).toFixed(1)}% {p.ev_over25 > 0.05 ? "✓" : ""}</td>
                      <td style={styles.td}>{(p.confianza * 100).toFixed(1)}%</td>
                      <td style={{ ...styles.td, color: "#888" }}>{p.modelo}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "nueva" && (
          <div style={{ ...styles.card, maxWidth: "500px" }}>
            <p style={{ ...styles.label, fontSize: "14px", marginBottom: "16px" }}>Registrar nueva apuesta</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div><label style={styles.label}>Partido</label><input style={styles.input} placeholder="Ej: River vs Boca" value={form.partido} onChange={e => setForm({ ...form, partido: e.target.value })} /></div>
              <div><label style={styles.label}>Casa de apuestas</label>
                <select style={styles.input} value={form.casa} onChange={e => setForm({ ...form, casa: e.target.value })}>
                  <option>Betano</option><option>Stake</option><option>Bet365</option><option>Otra</option>
                </select>
              </div>
              <div><label style={styles.label}>Mercado</label>
                <select style={styles.input} value={form.mercado} onChange={e => setForm({ ...form, mercado: e.target.value })}>
                  <option value="1X2">1X2</option><option value="over_under">Over/Under</option><option value="btts">BTTS</option><option value="handicap">Hándicap</option>
                </select>
              </div>
              <div><label style={styles.label}>Selección</label><input style={styles.input} placeholder="Ej: local, over, visita" value={form.seleccion} onChange={e => setForm({ ...form, seleccion: e.target.value })} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={styles.label}>Cuota</label><input style={styles.input} type="number" step="0.01" value={form.cuota} onChange={e => setForm({ ...form, cuota: e.target.value })} /></div>
                <div><label style={styles.label}>Stake (S/.)</label><input style={styles.input} type="number" step="0.01" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} /></div>
              </div>
              <div><label style={styles.label}>EV (opcional, ej: 0.15 para +15%)</label><input style={styles.input} type="number" step="0.01" value={form.ev} onChange={e => setForm({ ...form, ev: e.target.value })} /></div>
              <div><label style={styles.label}>Resultado</label>
                <select style={styles.input} value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })}>
                  <option value="pendiente">Pendiente</option><option value="ganada">Ganada</option><option value="perdida">Perdida</option><option value="nula">Nula</option>
                </select>
              </div>
              <button style={styles.btn} onClick={guardarApuesta}>Guardar apuesta</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}