import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const BANKROLL_INICIAL = 900;

const MERCADOS = [
  { value: "1X2", label: "1X2 — Resultado", linea: false },
  { value: "doble_oportunidad", label: "Doble oportunidad (1X / X2 / 12)", linea: false },
  { value: "over_under", label: "Over/Under goles", linea: "goles", opciones: ["0.5","1.5","2.5","3.5","4.5"] },
  { value: "btts", label: "AA — Ambos Anotan", linea: false },
  { value: "handicap", label: "Hándicap", linea: "handicap", opciones: ["-4","-3","-2","-1","+1","+2","+3","+4"] },
  { value: "tarjetas", label: "Tarjetas", linea: "tarjetas", opciones: ["1.5","2.5","3.5","4.5","5.5","6.5"] },
  { value: "primer_tiempo_ou", label: "Primer tiempo Over/Under", linea: "pt", opciones: ["0.5","1.5","2.5"] },
  { value: "primer_tiempo_1x2", label: "Primer tiempo 1X2", linea: false },
  { value: "combinada", label: "Combinada (varios partidos)", linea: false },
  { value: "betbuilder", label: "BetBuilder (mismo partido)", linea: false },
  { value: "primer_gol", label: "Primer gol", linea: false },
];

const SELECCIONES = {
  "1X2": ["Local", "Empate", "Visita"],
  "doble_oportunidad": ["1X (Local o Empate)", "X2 (Empate o Visita)", "12 (Local o Visita)"],
  "over_under": ["Over", "Under"],
  "btts": ["Sí ambos anotan", "No ambos anotan"],
  "handicap": ["Local -", "Local +", "Visita -", "Visita +"],
  "tarjetas": ["Más de línea", "Menos de línea"],
  "primer_tiempo_ou": ["Over", "Under"],
  "primer_tiempo_1x2": ["Local 1T", "Empate 1T", "Visita 1T"],
  "combinada": ["Combinada"],
  "betbuilder": ["BetBuilder"],
  "primer_gol": ["Local anota primero", "Visita anota primero", "Sin goles"],
};

export default function App() {
  const [apuestas, setApuestas] = useState([]);
  const [predicciones, setPredicciones] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [apuestaAbierta, setApuestaAbierta] = useState(null);

  const mercadoActual = MERCADOS.find(m => m.value === "1X2");
  const stakeDefault = (BANKROLL_INICIAL * 0.02).toFixed(2);

  const [form, setForm] = useState({
    partido: "",
    partidos_combinada: "",
    mercado: "1X2",
    linea: "",
    seleccion: "Local",
    cuota: "",
    stake: stakeDefault,
    prob: "",
    ev: "",
    resultado: "pendiente",
    casa: "Betano",
    momento: "prepartido",
    comentario: "",
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: ap } = await supabase
      .from("apuestas").select("*")
      .order("registrada_en", { ascending: true });
    const { data: pred } = await supabase
      .from("predicciones").select("*")
      .order("generado_en", { ascending: false }).limit(20);
    setApuestas(ap || []);
    setPredicciones(pred || []);
    setLoading(false);
  }

  const totalApostado = apuestas.reduce((s, a) => s + (a.stake || 0), 0);
  const gananciaNeta = apuestas.reduce((s, a) => s + (a.ganancia_neta || 0), 0);
  const ganadas = apuestas.filter(a => a.resultado === "ganada").length;
  const perdidas = apuestas.filter(a => a.resultado === "perdida").length;
  const cashouts = apuestas.filter(a => a.resultado === "cashout").length;
  const total = apuestas.length;
  const winrate = total > 0 ? (ganadas / total * 100).toFixed(1) : 0;
  const yield_ = totalApostado > 0 ? (gananciaNeta / totalApostado * 100).toFixed(2) : 0;
  const roi = (gananciaNeta / BANKROLL_INICIAL * 100).toFixed(2);
  const bankrollActual = BANKROLL_INICIAL + gananciaNeta;
  const stakeActual = (bankrollActual * 0.02).toFixed(2);

  // Rentabilidad en vivo vs prepartido
  const apEnVivo = apuestas.filter(a => a.notas?.includes("[VIVO]"));
  const apPrepartido = apuestas.filter(a => !a.notas?.includes("[VIVO]"));
  const yieldVivo = apEnVivo.length > 0 ? (apEnVivo.reduce((s,a) => s+(a.ganancia_neta||0),0) / apEnVivo.reduce((s,a) => s+(a.stake||0),0) * 100).toFixed(1) : null;
  const yieldPrepartido = apPrepartido.length > 0 ? (apPrepartido.reduce((s,a) => s+(a.ganancia_neta||0),0) / apPrepartido.reduce((s,a) => s+(a.stake||0),0) * 100).toFixed(1) : null;

  let saldo = BANKROLL_INICIAL;
  const graficoBankroll = apuestas.map((a, i) => {
    saldo += (a.ganancia_neta || 0);
    return { name: `#${i + 1}`, bankroll: parseFloat(saldo.toFixed(2)) };
  });

  function getMercadoLabel(value) {
    return MERCADOS.find(m => m.value === value)?.label || value;
  }

  function getLineasMercado(mercadoValue) {
    return MERCADOS.find(m => m.value === mercadoValue)?.opciones || [];
  }

  function tieneLinea(mercadoValue) {
    return !!MERCADOS.find(m => m.value === mercadoValue)?.linea;
  }

  function handleMercadoChange(nuevoMercado) {
    const lineas = getLineasMercado(nuevoMercado);
    const sels = SELECCIONES[nuevoMercado] || ["Selección"];
    setForm(f => ({
      ...f,
      mercado: nuevoMercado,
      linea: lineas.length > 0 ? lineas[0] : "",
      seleccion: sels[0],
    }));
  }

  function handleProbChange(probStr) {
    const prob = parseFloat(probStr) / 100;
    const cuota = parseFloat(form.cuota);
    const ev = cuota && prob && !isNaN(prob) && !isNaN(cuota)
      ? ((prob * cuota) - 1).toFixed(3) : "";
    setForm(f => ({ ...f, prob: probStr, ev }));
  }

  function handleCuotaChange(cuotaStr) {
    const cuota = parseFloat(cuotaStr);
    const prob = parseFloat(form.prob) / 100;
    const ev = cuota && prob && !isNaN(prob) && !isNaN(cuota)
      ? ((prob * cuota) - 1).toFixed(3) : "";
    setForm(f => ({ ...f, cuota: cuotaStr, ev }));
  }

  function stakeWarning() {
    const s = parseFloat(form.stake);
    const recomendado = bankrollActual * 0.02;
    if (s > recomendado * 2) return "⚠️ Stake muy alto — riesgo elevado";
    if (s > recomendado * 1.3) return "⚠️ Stake superior al 2% recomendado";
    return null;
  }

  async function guardarApuesta() {
    if (!form.partido || !form.cuota) return alert("Completá partido y cuota");
    const stake = parseFloat(form.stake);
    const cuota = parseFloat(form.cuota);
    const esCashout = form.resultado === "cashout";
    let ganancia = 0;
    if (form.resultado === "ganada") ganancia = stake * (cuota - 1);
    else if (form.resultado === "perdida") ganancia = -stake;
    else if (esCashout) ganancia = 0;

    const esCombinada = form.mercado === "combinada" || form.mercado === "betbuilder";
    const partidoTexto = esCombinada && form.partidos_combinada
      ? `${form.partido} | Partidos: ${form.partidos_combinada}`
      : form.partido;

    const lineaTexto = form.linea ? ` (${form.linea})` : "";
    const momentoTag = form.momento === "vivo" ? " [VIVO]" : " [PREPARTIDO]";

    const { error } = await supabase.from("apuestas").insert({
      mercado: form.mercado + lineaTexto,
      seleccion: form.seleccion,
      cuota,
      stake,
      ev: form.ev ? parseFloat(form.ev) : null,
      resultado: form.resultado,
      casa: form.casa,
      ganancia_neta: ganancia,
      notas: partidoTexto + momentoTag + (form.comentario ? ` | ${form.comentario}` : ""),
    });

    if (error) { alert("Error: " + error.message); return; }
    alert("✓ Apuesta guardada");
    setForm(f => ({ ...f, partido: "", partidos_combinada: "", cuota: "", prob: "", ev: "", comentario: "", resultado: "pendiente", stake: stakeActual }));
    cargarDatos();
  }

  function generarReporte() {
    const lineas = [
      ["Partido", "Mercado", "Selección", "Cuota", "Stake", "EV%", "Resultado", "G/P", "Casa", "Momento"].join(","),
      ...apuestas.map(a => [
        `"${a.notas || ""}"`,
        `"${a.mercado}"`,
        `"${a.seleccion}"`,
        a.cuota,
        a.stake,
        a.ev ? (a.ev * 100).toFixed(1) : "",
        a.resultado,
        (a.ganancia_neta || 0).toFixed(2),
        `"${a.casa || ""}"`,
        a.notas?.includes("[VIVO]") ? "En vivo" : "Prepartido",
      ].join(","))
    ].join("\n");

    const blob = new Blob([lineas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edgebet_reporte_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }

  // ── ESTILOS ──────────────────────────────────────────────────────────────
  const s = {
    app: { fontFamily: "system-ui,sans-serif", background: "#0f0f0f", minHeight: "100vh", color: "#e0e0e0" },
    header: { background: "#1a1a2e", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2a2a4a", flexWrap: "wrap", gap: "8px" },
    logo: { fontSize: "18px", fontWeight: "700", color: "#7c6af7" },
    bankrollHeader: { fontSize: "13px", color: "#888" },
    tabs: { display: "flex", gap: "4px", padding: "12px 16px 0", flexWrap: "wrap", overflowX: "auto" },
    tab: (active) => ({ padding: "8px 14px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", background: active ? "#1e1e3a" : "transparent", color: active ? "#7c6af7" : "#888", borderBottom: active ? "2px solid #7c6af7" : "2px solid transparent", whiteSpace: "nowrap" }),
    content: { padding: "16px" },
    grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginBottom: "16px" },
    grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "10px", marginBottom: "16px" },
    card: { background: "#1e1e3a", borderRadius: "12px", padding: "14px 16px", border: "1px solid #2a2a4a" },
    label: { fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 5px" },
    value: { fontSize: "22px", fontWeight: "600", margin: "0" },
    sub: { fontSize: "11px", color: "#888", margin: "3px 0 0" },
    pos: { color: "#4ade80" },
    neg: { color: "#f87171" },
    neu: { color: "#888" },
    warn: { color: "#fbbf24" },
    tableWrap: { overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "600px" },
    th: { textAlign: "left", padding: "10px 12px", color: "#888", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #2a2a4a", whiteSpace: "nowrap" },
    td: { padding: "10px 12px", borderBottom: "1px solid #1a1a2e", color: "#e0e0e0", verticalAlign: "top" },
    badge: (tipo) => ({
      display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600",
      background: tipo === "ganada" ? "#14532d" : tipo === "perdida" ? "#450a0a" : tipo === "cashout" ? "#1a3a2a" : tipo === "pendiente" ? "#1e3a5f" : "#2a2a2a",
      color: tipo === "ganada" ? "#4ade80" : tipo === "perdida" ? "#f87171" : tipo === "cashout" ? "#34d399" : tipo === "pendiente" ? "#60a5fa" : "#888"
    }),
    evBadge: (ev) => ({ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", background: ev > 0.05 ? "#14532d" : ev > 0 ? "#2a3a1a" : "#450a0a", color: ev > 0.05 ? "#4ade80" : ev > 0 ? "#86efac" : "#f87171" }),
    momentoBadge: (m) => ({ display: "inline-block", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", background: m ? "#1a2a3a" : "#2a1a3a", color: m ? "#60a5fa" : "#c084fc" }),
    btn: { background: "#7c6af7", color: "white", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", width: "100%" },
    btnSec: { background: "#1e1e3a", color: "#7c6af7", border: "1px solid #7c6af7", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500" },
    input: { background: "#0f0f0f", border: "1px solid #2a2a4a", borderRadius: "8px", padding: "9px 12px", color: "#e0e0e0", fontSize: "13px", width: "100%", boxSizing: "border-box" },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
    formGroup: { display: "flex", flexDirection: "column", gap: "4px" },
    hint: (tipo) => ({ fontSize: "11px", marginTop: "3px", color: tipo === "pos" ? "#4ade80" : tipo === "neg" ? "#f87171" : tipo === "warn" ? "#fbbf24" : "#888" }),
    modal: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" },
    modalCard: { background: "#1e1e3a", borderRadius: "12px", padding: "20px", border: "1px solid #2a2a4a", maxWidth: "500px", width: "100%", maxHeight: "80vh", overflowY: "auto" },
  };

  if (loading) return (
    <div style={{ ...s.app, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#7c6af7" }}>
      Cargando EdgeBet...
    </div>
  );

  const mercadoInfo = MERCADOS.find(m => m.value === form.mercado);
  const selecciones = SELECCIONES[form.mercado] || ["Selección"];
  const lineas = getLineasMercado(form.mercado);
  const esCombinada = form.mercado === "combinada" || form.mercado === "betbuilder";
  const evNum = parseFloat(form.ev);
  const stakeWarn = stakeWarning();

  return (
    <div style={s.app}>

      {/* HEADER */}
      <div style={s.header}>
        <span style={s.logo}>⚡ AaronWinter</span>
        <span style={s.bankrollHeader}>
          Bankroll: <span style={{ color: "#4ade80", fontWeight: "600" }}>S/. {bankrollActual.toFixed(2)}</span>
          <span style={{ marginLeft: "12px", color: "#7c6af7" }}>Stake 2%: S/. {stakeActual}</span>
        </span>
      </div>

      {/* TABS */}
      <div style={s.tabs}>
        {[
          { id: "dashboard", label: "📊 Dashboard" },
          { id: "apuestas", label: "📋 Historial" },
          { id: "predicciones", label: "🤖 Predicciones" },
          { id: "nueva", label: "➕ Nueva apuesta" },
        ].map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <>
            <div style={s.grid4}>
              <div style={s.card}>
                <p style={s.label}>Bankroll</p>
                <p style={{ ...s.value, color: "#7c6af7" }}>S/. {bankrollActual.toFixed(0)}</p>
                <p style={s.sub}>Inicial: S/. {BANKROLL_INICIAL}</p>
              </div>
              <div style={s.card}>
                <p style={s.label}>Yield</p>
                <p style={{ ...s.value, ...(yield_ >= 0 ? s.pos : s.neg) }}>{yield_ >= 0 ? "+" : ""}{yield_}%</p>
                <p style={s.sub}>Sobre stakes totales</p>
              </div>
              <div style={s.card}>
                <p style={s.label}>ROI</p>
                <p style={{ ...s.value, ...(roi >= 0 ? s.pos : s.neg) }}>{roi >= 0 ? "+" : ""}{roi}%</p>
                <p style={s.sub}>Sobre bankroll inicial</p>
              </div>
              <div style={s.card}>
                <p style={s.label}>Winrate</p>
                <p style={s.value}>{winrate}%</p>
                <p style={s.sub}>{ganadas}G · {perdidas}P · {cashouts}CO · {total - ganadas - perdidas - cashouts} pend.</p>
              </div>
            </div>

            {/* Vivo vs Prepartido */}
            <div style={s.grid2}>
              <div style={s.card}>
                <p style={s.label}>🔴 En vivo — Yield</p>
                <p style={{ ...s.value, ...(yieldVivo >= 0 ? s.pos : s.neg) }}>
                  {yieldVivo !== null ? `${yieldVivo >= 0 ? "+" : ""}${yieldVivo}%` : "Sin datos"}
                </p>
                <p style={s.sub}>{apEnVivo.length} apuestas</p>
              </div>
              <div style={s.card}>
                <p style={s.label}>📋 Prepartido — Yield</p>
                <p style={{ ...s.value, ...(yieldPrepartido >= 0 ? s.pos : s.neg) }}>
                  {yieldPrepartido !== null ? `${yieldPrepartido >= 0 ? "+" : ""}${yieldPrepartido}%` : "Sin datos"}
                </p>
                <p style={s.sub}>{apPrepartido.length} apuestas</p>
              </div>
            </div>

            {/* Gráfico */}
            <div style={s.card}>
              <p style={{ ...s.label, marginBottom: "14px" }}>Evolución del bankroll</p>
              {graficoBankroll.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={graficoBankroll}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="name" stroke="#888" fontSize={10} />
                    <YAxis stroke="#888" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1e1e3a", border: "1px solid #2a2a4a", borderRadius: "8px", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="bankroll" stroke="#7c6af7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>Registrá apuestas para ver la evolución</p>
              )}
            </div>
          </>
        )}

        {/* ── HISTORIAL ── */}
        {tab === "apuestas" && (
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ ...s.label, margin: 0 }}>{total} apuestas registradas</p>
              <button style={s.btnSec} onClick={generarReporte}>⬇ Descargar reporte CSV</button>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Partido</th>
                    <th style={s.th}>Mercado</th>
                    <th style={s.th}>Cuota</th>
                    <th style={s.th}>Stake</th>
                    <th style={s.th}>EV</th>
                    <th style={s.th}>Momento</th>
                    <th style={s.th}>Resultado</th>
                    <th style={s.th}>G/P</th>
                    <th style={s.th}>Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {apuestas.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#888" }}>Sin apuestas registradas</td></tr>
                  ) : apuestas.slice().reverse().map(a => {
                    const esVivo = a.notas?.includes("[VIVO]");
                    return (
                      <tr key={a.id}>
                        <td style={{ ...s.td, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.notas?.split("|")[0]?.replace("[VIVO]","").replace("[PREPARTIDO]","").trim() || "—"}
                        </td>
                        <td style={s.td}>{a.mercado}</td>
                        <td style={s.td}>{a.cuota}</td>
                        <td style={s.td}>S/. {a.stake}</td>
                        <td style={s.td}>
                          {a.ev != null ? <span style={s.evBadge(a.ev)}>{a.ev > 0 ? "+" : ""}{(a.ev * 100).toFixed(1)}%</span> : "—"}
                        </td>
                        <td style={s.td}>
                          <span style={s.momentoBadge(esVivo)}>{esVivo ? "🔴 Vivo" : "📋 Pre"}</span>
                        </td>
                        <td style={s.td}><span style={s.badge(a.resultado)}>{a.resultado}</span></td>
                        <td style={{ ...s.td, ...(a.ganancia_neta >= 0 ? s.pos : s.neg) }}>
                          {a.ganancia_neta >= 0 ? "+" : ""}S/. {(a.ganancia_neta || 0).toFixed(2)}
                        </td>
                        <td style={s.td}>
                          <button onClick={() => setApuestaAbierta(a)} style={{ background: "none", border: "1px solid #2a2a4a", borderRadius: "6px", color: "#888", cursor: "pointer", padding: "3px 8px", fontSize: "12px" }}>
                            👁
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PREDICCIONES ── */}
        {tab === "predicciones" && (
          <div style={s.card}>
            <p style={{ ...s.label, marginBottom: "12px" }}>Predicciones generadas por el modelo Elo + Poisson</p>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Partido ID</th>
                    <th style={s.th}>Local</th>
                    <th style={s.th}>Empate</th>
                    <th style={s.th}>Visita</th>
                    <th style={s.th}>Over 2.5</th>
                    <th style={s.th}>BTTS</th>
                    <th style={s.th}>Confianza</th>
                  </tr>
                </thead>
                <tbody>
                  {predicciones.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#888" }}>Sin predicciones generadas</td></tr>
                  ) : predicciones.map(p => (
                    <tr key={p.id}>
                      <td style={s.td}>#{p.partido_id}</td>
                      <td style={{ ...s.td, ...(p.ev_local > 0.05 ? s.pos : s.neu) }}>
                        {(p.prob_local * 100).toFixed(1)}% {p.ev_local > 0.05 ? "✓" : ""}
                      </td>
                      <td style={{ ...s.td, ...(p.ev_empate > 0.05 ? s.pos : s.neu) }}>
                        {(p.prob_empate * 100).toFixed(1)}% {p.ev_empate > 0.05 ? "✓" : ""}
                      </td>
                      <td style={{ ...s.td, ...(p.ev_visita > 0.05 ? s.pos : s.neu) }}>
                        {(p.prob_visita * 100).toFixed(1)}% {p.ev_visita > 0.05 ? "✓" : ""}
                      </td>
                      <td style={{ ...s.td, ...(p.ev_over25 > 0.05 ? s.pos : s.neu) }}>
                        {(p.prob_over25 * 100).toFixed(1)}% {p.ev_over25 > 0.05 ? "✓" : ""}
                      </td>
                      <td style={s.td}>{(p.prob_btts_si * 100).toFixed(1)}%</td>
                      <td style={s.td}>{(p.confianza * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── NUEVA APUESTA ── */}
        {tab === "nueva" && (
          <div style={{ ...s.card, maxWidth: "520px", margin: "0 auto" }}>
            <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0", margin: "0 0 16px" }}>Registrar apuesta</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Partido */}
              <div style={s.formGroup}>
                <label style={s.label}>Partido</label>
                <input style={s.input} placeholder="Ej: River vs Boca" value={form.partido}
                  onChange={e => setForm(f => ({ ...f, partido: e.target.value }))} />
              </div>

              {/* Si es combinada, campo extra */}
              {esCombinada && (
                <div style={s.formGroup}>
                  <label style={s.label}>Partidos incluidos (uno por línea)</label>
                  <textarea style={{ ...s.input, minHeight: "70px", resize: "vertical" }}
                    placeholder={"River vs Boca\nPSG vs Bayern\nReal Madrid vs Barça"}
                    value={form.partidos_combinada}
                    onChange={e => setForm(f => ({ ...f, partidos_combinada: e.target.value }))} />
                </div>
              )}

              {/* Casa + Momento */}
              <div style={s.row2}>
                <div style={s.formGroup}>
                  <label style={s.label}>Casa de apuestas</label>
                  <select style={s.input} value={form.casa} onChange={e => setForm(f => ({ ...f, casa: e.target.value }))}>
                    <option>Betano</option>
                    <option>Stake</option>
                    <option>Bet365</option>
                    <option>Codere</option>
                    <option>Otra</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Momento</label>
                  <select style={s.input} value={form.momento} onChange={e => setForm(f => ({ ...f, momento: e.target.value }))}>
                    <option value="prepartido">📋 Prepartido</option>
                    <option value="vivo">🔴 En vivo</option>
                  </select>
                </div>
              </div>

              {/* Mercado */}
              <div style={s.formGroup}>
                <label style={s.label}>Mercado</label>
                <select style={s.input} value={form.mercado} onChange={e => handleMercadoChange(e.target.value)}>
                  {MERCADOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Línea (si aplica) */}
              {lineas.length > 0 && (
                <div style={s.formGroup}>
                  <label style={s.label}>Línea</label>
                  <select style={s.input} value={form.linea} onChange={e => setForm(f => ({ ...f, linea: e.target.value }))}>
                    {lineas.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              {/* Selección */}
              <div style={s.formGroup}>
                <label style={s.label}>Selección</label>
                <select style={s.input} value={form.seleccion} onChange={e => setForm(f => ({ ...f, seleccion: e.target.value }))}>
                  {selecciones.map(sel => <option key={sel} value={sel}>{sel}</option>)}
                </select>
              </div>

              {/* Cuota + Stake */}
              <div style={s.row2}>
                <div style={s.formGroup}>
                  <label style={s.label}>Cuota</label>
                  <input style={s.input} type="number" step="0.01" min="1.01"
                    value={form.cuota} onChange={e => handleCuotaChange(e.target.value)} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Stake (S/.)</label>
                  <input style={s.input} type="number" step="1" value={form.stake}
                    onChange={e => setForm(f => ({ ...f, stake: e.target.value }))} />
                  {stakeWarn && <p style={s.hint("warn")}>{stakeWarn}</p>}
                  <p style={s.hint("")}>Recomendado: S/. {stakeActual}</p>
                </div>
              </div>

              {/* Probabilidad → EV */}
              <div style={s.formGroup}>
                <label style={s.label}>Tu probabilidad estimada (%) — opcional</label>
                <input style={s.input} type="number" step="1" min="1" max="99"
                  placeholder="Ej: 60 si creés que hay 60% de chance"
                  value={form.prob} onChange={e => handleProbChange(e.target.value)} />
                {form.ev !== "" && !isNaN(evNum) && (
                  <p style={s.hint(evNum > 0.05 ? "pos" : evNum > 0 ? "warn" : "neg")}>
                    EV: {evNum > 0 ? "+" : ""}{(evNum * 100).toFixed(1)}%
                    {evNum > 0.05 ? " ✓ Value bet" : evNum > 0 ? " ~ Margen bajo" : " ✗ Sin valor"}
                  </p>
                )}
              </div>

              {/* Resultado */}
              <div style={s.formGroup}>
                <label style={s.label}>Resultado</label>
                <select style={s.input} value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}>
                  <option value="pendiente">Pendiente</option>
                  <option value="ganada">Ganada</option>
                  <option value="perdida">Perdida</option>
                  <option value="cashout">Cashout</option>
                  <option value="nula">Nula</option>
                </select>
              </div>

              {/* Comentario */}
              <div style={s.formGroup}>
                <label style={s.label}>Comentario (opcional)</label>
                <input style={s.input} placeholder="Ej: equipo local con bajas, cuota movió de 2.1 a 1.9..."
                  value={form.comentario} onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))} />
              </div>

              <button style={s.btn} onClick={guardarApuesta}>Guardar apuesta</button>
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL DETALLE APUESTA ── */}
      {apuestaAbierta && (
        <div style={s.modal} onClick={() => setApuestaAbierta(null)}>
          <div style={s.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <p style={{ fontWeight: "600", fontSize: "15px", margin: 0 }}>Detalle de apuesta</p>
              <button onClick={() => setApuestaAbierta(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            {[
              ["Partido / Notas", apuestaAbierta.notas || "—"],
              ["Mercado", apuestaAbierta.mercado],
              ["Selección", apuestaAbierta.seleccion],
              ["Casa", apuestaAbierta.casa || "—"],
              ["Cuota", apuestaAbierta.cuota],
              ["Stake", `S/. ${apuestaAbierta.stake}`],
              ["EV", apuestaAbierta.ev != null ? `${apuestaAbierta.ev > 0 ? "+" : ""}${(apuestaAbierta.ev * 100).toFixed(1)}%` : "—"],
              ["Momento", apuestaAbierta.notas?.includes("[VIVO]") ? "🔴 En vivo" : "📋 Prepartido"],
              ["Resultado", apuestaAbierta.resultado],
              ["Ganancia/Pérdida", `${apuestaAbierta.ganancia_neta >= 0 ? "+" : ""}S/. ${(apuestaAbierta.ganancia_neta || 0).toFixed(2)}`],
              ["Fecha", new Date(apuestaAbierta.registrada_en).toLocaleString("es-PE")],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #2a2a4a", fontSize: "13px" }}>
                <span style={{ color: "#888" }}>{k}</span>
                <span style={{ color: "#e0e0e0", textAlign: "right", maxWidth: "60%" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}