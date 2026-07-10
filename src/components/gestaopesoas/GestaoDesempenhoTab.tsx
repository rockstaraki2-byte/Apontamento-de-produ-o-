import React, { useState, useMemo } from "react";
import { 
  Users, 
  PlusCircle, 
  FileText, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Check, 
  Trash2, 
  ChevronRight, 
  Star, 
  CheckSquare, 
  BarChart, 
  Calendar, 
  Activity, 
  Percent,
  FileCode,
  Wrench,
  Sparkles,
  X
} from "lucide-react";
import type { useDatabase } from "../../useDatabase";
import type { User, Employee, PerformanceQuestion, PerformanceReview } from "../../types";
import mammoth from "mammoth";

// Helper benchmark rating mapping
const SECTOR_BENCHMARKS: Record<string, number> = {
  "CORTE_LASER": 20.0,
  "PINTURA": 35.0,
  "EMBALAGEM": 40.0,
  "PRENSA": 10.0,
  "TORNO_CNC": 10.0,
  "INJETORA": 25.0,
  "BANHO_QUIMICO": 18.0,
  "DEFAULT": 15.0
};

export function GestaoDesempenhoTab({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  
  // Tab within Gestão de Pessoas
  const [panelView, setPanelView] = useState<"COLABORADORES" | "PERGUNTAS">("COLABORADORES");

  // State to manage making an evaluation
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, { rating: number; comment: string }>>({});
  const [generalComment, setGeneralComment] = useState("");

  // State for adding a manual question
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionCategory, setNewQuestionCategory] = useState("Geral");

  // State for parsed DOCX questions
  const [parsedDocQuestions, setParsedDocQuestions] = useState<string[]>([]);
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [uploadingDocx, setUploadingDocx] = useState(false);

  // Find selected employee
  const selectedEmp = db.employees.find((e) => e.id === selectedEmpId);

  // Default standard questions if none exists in Firestore
  const activeQuestions = db.performanceQuestions.length > 0 
    ? db.performanceQuestions 
    : [
        { id: "std-1", text: "Demonstra domínio técnico nas funções operacionais do setor?", category: "Técnico", createdAt: 0 },
        { id: "std-2", text: "Trabalha com segurança, organizando as paradas de máquina e limpeza?", category: "Segurança", createdAt: 0 },
        { id: "std-3", text: "Mantém as metas de produtividade média estabelecidas pelo setor?", category: "Produtividade", createdAt: 0 },
        { id: "std-4", text: "Mostra flexibilidade em colaborar com outros membros da equipe?", category: "Comportamental", createdAt: 0 }
      ];

  // Helper: calculate employee productivity from db.logs
  const employeePphStats = useMemo(() => {
    if (!selectedEmp) return { pph: 0, count: 0 };
    
    // find logs where operatorName/operatorId contains or matches
    const operatorLogs = db.logs.filter((l) => {
      const opIdStr = String(l.operatorId).toLowerCase();
      const empIdStr = String(selectedEmp.id).toLowerCase();
      const empNameStr = selectedEmp.name.toLowerCase();
      return (
        opIdStr === empIdStr || 
        opIdStr.includes(empIdStr) || 
        opIdStr.includes(empNameStr) ||
        (l.operatorName && l.operatorName.toLowerCase().includes(empNameStr))
      );
    });

    if (operatorLogs.length === 0) return { pph: 0, count: 0 };

    // Calculate PPH for each log
    const pphList = operatorLogs.map((log) => {
      const qty = (log.quantityProcessed || 0) +
                  (log.quantityCut || 0) +
                  (log.quantityPainted || 0) +
                  (log.quantityPacked || 0) ||
                  log.quantityInvoiced || 
                  log.quantity ||
                  0;
      const dMs = log.durationMillis || 10 * 60 * 1000; // default 10 minutes
      const hours = dMs / (1000 * 60 * 60);
      return hours > 0 ? (qty / hours) : 0;
    }).filter(p => p > 0);

    if (pphList.length === 0) return { pph: 0, count: 0 };

    const avgPph = pphList.reduce((sum, val) => sum + val, 0) / pphList.length;
    return {
      pph: Math.round(avgPph * 10) / 10,
      count: operatorLogs.length
    };
  }, [db.logs, selectedEmp]);

  // Helper: calculate overall sector actual average PPH
  const sectorAveragePph = useMemo(() => {
    if (!selectedEmp) return 0;
    const sectorIdStr = String(selectedEmp.sectorId);
    
    const sectorLogs = db.logs.filter((l) => {
      // match sectorId if present, or guess sector from operatorId role mapping
      return String(l.sectorId) === sectorIdStr || String(l.process).toLowerCase().includes(sectorIdStr);
    });

    if (sectorLogs.length === 0) {
      // Fallback: average logs from all employees of same sector
      const sectorEmpNames = db.employees
        .filter((e) => e.sectorId === selectedEmp.sectorId)
        .map((e) => e.name.toLowerCase());

      const alternateLogs = db.logs.filter((l) => {
        const opStr = String(l.operatorId || l.operatorName || "").toLowerCase();
        return sectorEmpNames.some(name => opStr.includes(name));
      });

      if (alternateLogs.length === 0) return 0;

      const pphList = alternateLogs.map((log) => {
        const qty = (log.quantityProcessed || 0) + (log.quantityCut || 0) || log.quantity || 0;
        const dMs = log.durationMillis || 10 * 60 * 1000;
        return qty / (dMs / 3600000);
      }).filter(p => p > 0);

      return pphList.length > 0 ? Math.round((pphList.reduce((a,b)=>a+b, 0)/pphList.length) * 10) / 10 : 0;
    }

    const pphList = sectorLogs.map((log) => {
      const qty = (log.quantityProcessed || 0) + (log.quantityCut || 0) || log.quantity || 0;
      const dMs = log.durationMillis || 10 * 60 * 1000;
      return qty / (dMs / 3600000);
    }).filter(p => p > 0);

    const avg = pphList.reduce((s, v) => s + v, 0) / pphList.length;
    return Math.round(avg * 10) / 10;
  }, [db.logs, db.employees, selectedEmp]);

  // Sector model look-up
  const sectorInfo = useMemo(() => {
    if (!selectedEmp) return null;
    const sect = db.sectors.find((s) => s.id === selectedEmp.sectorId);
    
    // Guess sector key for benchmark lookup
    let bKey = "DEFAULT";
    if (sect) {
      const nameUpper = sect.name.toUpperCase();
      if (nameUpper.includes("LASER")) bKey = "CORTE_LASER";
      else if (nameUpper.includes("PINTURA")) bKey = "PINTURA";
      else if (nameUpper.includes("EMBALA")) bKey = "EMBALAGEM";
      else if (nameUpper.includes("PRENSA")) bKey = "PRENSA";
      else if (nameUpper.includes("TORNO")) bKey = "TORNO_CNC";
      else if (nameUpper.includes("INJETORA")) bKey = "INJETORA";
      else if (nameUpper.includes("BANHO")) bKey = "BANHO_QUIMICO";
    }

    return {
      name: sect?.name || "Setor Não Identificado",
      benchmark: SECTOR_BENCHMARKS[bKey] || SECTOR_BENCHMARKS["DEFAULT"]
    };
  }, [db.sectors, selectedEmp]);

  // Load reviews for the selected employee
  const employeeReviews = useMemo(() => {
    if (!selectedEmpId) return [];
    return db.performanceReviews
      .filter((r) => String(r.employeeId) === String(selectedEmpId))
      .sort((a, b) => b.date - a.date);
  }, [db.performanceReviews, selectedEmpId]);

  // Evolution indicator (compares last 2 reviews)
  const evolutionMetric = useMemo(() => {
    if (employeeReviews.length < 2) return null;
    const latest = employeeReviews[0];
    const past = employeeReviews[1];

    // calculate avg rating of each
    const latestAvg = latest.answers.reduce((sum, a) => sum + a.rating, 0) / (latest.answers.length || 1);
    const pastAvg = past.answers.reduce((sum, a) => sum + a.rating, 0) / (past.answers.length || 1);

    const scoreDiff = latestAvg - pastAvg;
    const prodDiff = latest.productivityMetric - past.productivityMetric;

    return {
      scoreDiff: Math.round(scoreDiff * 10) / 10,
      prodDiff: Math.round(prodDiff * 10) / 10,
    };
  }, [employeeReviews]);

  // Handle uploading docx file
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDocx(true);
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          
          // Split into paragraphs and filter candidates ending with "?"
          const paragraphs = text
            .split("\n")
            .map((p) => p.trim())
            .filter((p) => p.length >= 10);

          const questionsFound = paragraphs.filter((p) => {
            // matches lines ending in ? OR starting with "1. ", "a) " etc.
            const isQuestionMark = p.endsWith("?");
            const isNumberedListItem = /^\d+[\.\-\)]\s+/.test(p);
            return isQuestionMark || isNumberedListItem;
          });

          if (questionsFound.length === 0) {
            alert("Não foi possível detectar perguntas óbvias no documento. Exibindo parágrafos longos para você revisar.");
            setParsedDocQuestions(paragraphs.slice(0, 15));
          } else {
            setParsedDocQuestions(questionsFound);
          }
          setShowDocxModal(true);
        } catch (err) {
          console.error(err);
          alert("Erro ao extrair textos do arquivo .docx.");
        } finally {
          setUploadingDocx(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch {
      alert("Erro ao carregar o arquivo.");
      setUploadingDocx(false);
    }
  };

  // Confirm importing questions from DOCX
  const handleImportDocxQuestions = async (selectedTexts: string[]) => {
    try {
      for (const text of selectedTexts) {
        await db.addPerformanceQuestion({
          text,
          category: "DOCX",
          createdAt: Date.now()
        });
      }
      setShowDocxModal(false);
      setParsedDocQuestions([]);
      alert(`${selectedTexts.length} perguntas importadas com sucesso!`);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar as perguntas importadas.");
    }
  };

  // Add manual question
  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    try {
      await db.addPerformanceQuestion({
        text: newQuestionText.trim(),
        category: newQuestionCategory,
        createdAt: Date.now()
      });
      setNewQuestionText("");
      alert("Pergunta cadastrada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar pergunta.");
    }
  };

  // Delete evaluation question
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta pergunta da base de avaliação?")) return;
    try {
      await db.deletePerformanceQuestion(id);
    } catch (err) {
      console.error(err);
      alert("Erro ao apagar pergunta.");
    }
  };

  // Submit Evaluation
  const handleSaveEvaluation = async () => {
    if (!selectedEmp) return;

    // Verify all questions have been answered
    const unanswered = activeQuestions.some(q => !answers[q.id]);
    if (unanswered) {
      alert("Por favor, responda a todas as dezenas de avaliação de desempenho antes de salvar.");
      return;
    }

    try {
      const answersArray = activeQuestions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        rating: answers[q.id].rating,
        comment: answers[q.id].comment || "",
      }));

      await db.addPerformanceReview({
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        date: Date.now(),
        reviewerId: currentUser.id,
        answers: answersArray,
        generalComment,
        productivityMetric: employeePphStats.pph,
        sectorBenchmarkMetric: sectorInfo?.benchmark || 15,
        sectorAverageMetric: sectorAveragePph || 0
      });

      setEvaluating(false);
      setAnswers({});
      setGeneralComment("");
      alert("Avaliação de Desempenho registrada e arquivada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar avaliação de desempenho.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 font-sans p-2">
      
      {/* Navigation tabs for People Management */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => { setPanelView("COLABORADORES"); setEvaluating(false); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            panelView === "COLABORADORES" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          👤 Avaliação de Colaboradores
        </button>
        <button
          onClick={() => setPanelView("PERGUNTAS")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            panelView === "PERGUNTAS" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          📋 Banco de Perguntas de Avaliação
        </button>
      </div>

      {panelView === "COLABORADORES" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Employee list block */}
          <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" /> Colaboradores Ativos ({db.employees.length})
            </h3>
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
              {db.employees.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum colaborador cadastrado.</p>
              ) : (
                db.employees.map((emp) => {
                  const s = db.sectors.find((sec) => sec.id === emp.sectorId);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => { setSelectedEmpId(emp.id); setEvaluating(false); }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                        selectedEmpId === emp.id
                          ? "bg-indigo-50 border-indigo-300 shadow-3xs"
                          : "bg-slate-50/50 border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <h4 className="font-bold text-slate-800 text-xs">{emp.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Setor: {s?.name || "Não atribuído"}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Details Dashboard column */}
          <div className="md:col-span-8 flex flex-col gap-4">
            {!selectedEmp ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <Users className="w-10 h-10 text-slate-300 mb-2 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-500">Nenhum Colaborador Selecionado</h3>
                <p className="text-[11px] text-slate-400 max-w-[280px] mt-1">
                  Selecione um funcionário na coluna lateral para gerenciar avaliações de ciclos de metas e visualizar dados.
                </p>
              </div>
            ) : evaluating ? (
              
              /* ASSESSMENT ACTIVE QUESTIONNAIRE SCREEN */
              <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-3xs space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">Formulário de Avaliação</span>
                    <h3 className="text-base font-extrabold text-slate-800 mt-0.5">Avaliando: {selectedEmp.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{sectorInfo?.name}</p>
                  </div>
                  <button 
                    onClick={() => setEvaluating(false)} 
                    className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {activeQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3.5">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {q.category}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">#{idx+1}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">{q.text}</p>
                      
                      {/* Rating (1-5 Stars) */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const userRating = answers[q.id]?.rating || 0;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setAnswers({
                                ...answers,
                                [q.id]: { rating: star, comment: answers[q.id]?.comment || "" }
                              })}
                              className="focus:outline-hidden hover:scale-110 transition"
                            >
                              <Star className={`w-6 h-6 ${
                                star <= userRating 
                                  ? "text-indigo-600 fill-indigo-600" 
                                  : "text-slate-300"
                              }`} />
                            </button>
                          );
                        })}
                        <span className="text-[11px] font-mono text-slate-500 ml-2 font-bold">
                          {answers[q.id]?.rating ? `${answers[q.id]?.rating} estrelas` : "(Sem Answer)"}
                        </span>
                      </div>

                      {/* Comment for Question */}
                      <input
                        type="text"
                        placeholder="Observações complementares a esta competência..."
                        value={answers[q.id]?.comment || ""}
                        onChange={(e) => setAnswers({
                          ...answers,
                          [q.id]: { rating: answers[q.id]?.rating || 0, comment: e.target.value }
                        })}
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden text-slate-700 placeholder-slate-400"
                      />
                    </div>
                  ))}

                  <div className="space-y-1.5 p-1">
                    <label className="text-xs font-bold text-slate-700 block">Parecer Geral do Avaliador</label>
                    <textarea
                      placeholder="Conclusão geral do deparamento, feedback dos líderes, planos de capacitação..."
                      value={generalComment}
                      onChange={(e) => setGeneralComment(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={handleSaveEvaluation}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs transition"
                  >
                    Salvar Avaliação de Desempenho
                  </button>
                  <button
                    onClick={() => setEvaluating(false)}
                    className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              
              /* EMPLOYEE DETAIL VIEW AND BENCHMARKS DASHBOARD */
              <div className="space-y-4">
                
                {/* Benchmark Dashboard Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">
                        Indicadores de Produtividade: {selectedEmp.name}
                      </h3>
                      <p className="text-[11px] text-indigo-600 font-bold">{sectorInfo?.name}</p>
                    </div>
                    <button
                      onClick={() => setEvaluating(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      + Nova Avaliação de Desempenho
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Real productivity */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Produtividade Real</span>
                      <span className="text-xl font-black font-mono text-slate-800 block my-1">
                        {employeePphStats.pph > 0 ? `${employeePphStats.pph}` : "N/A"}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {employeePphStats.count > 0 ? `${employeePphStats.count} logs processados` : "Sem logs recentes"}
                      </span>
                    </div>

                    {/* Sector Average */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Média do Setor</span>
                      <span className="text-xl font-black font-mono text-slate-800 block my-1">
                        {sectorAveragePph > 0 ? `${sectorAveragePph}` : "15.0"}
                      </span>
                      <span className="text-[9px] text-slate-400 block">PPH (peças por hora)</span>
                    </div>

                    {/* Sector Benchmark */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center flex flex-col justify-between">
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Meta do Setor</span>
                      <span className="text-xl font-black font-mono text-indigo-600 block my-1">
                        {sectorInfo?.benchmark}.0
                      </span>
                      <span className="text-[9px] text-indigo-500 font-bold block">PPH benchmark</span>
                    </div>
                  </div>

                  {/* Visual gauge representation */}
                  {employeePphStats.pph > 0 && (
                    <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2 text-sans">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-600">Aproveitamento da Meta do Colaborador</span>
                        <span className="font-black font-mono text-indigo-700">
                          {Math.round((employeePphStats.pph / (sectorInfo?.benchmark || 15)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.round((employeePphStats.pph / (sectorInfo?.benchmark || 15)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3-Month Performance Review Cycles Timeline */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> Histórico Trimestral de Avaliações
                    </h4>
                    {evolutionMetric && (
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 ${
                          evolutionMetric.scoreDiff >= 0 ? "text-emerald-800 bg-emerald-50" : "text-rose-800 bg-rose-50"
                        }`}>
                          {evolutionMetric.scoreDiff >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          Score: {evolutionMetric.scoreDiff >= 0 ? `+${evolutionMetric.scoreDiff}` : evolutionMetric.scoreDiff}pts
                        </span>
                      </div>
                    )}
                  </div>

                  {employeeReviews.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 italic text-xs">
                      Nenhuma avaliação registrada ainda para {selectedEmp.name}. 
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5">As avaliações trimestrais servem para mensurar a evolução de competências e produtividade.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {employeeReviews.map((rev) => {
                        const totalScore = rev.answers.reduce((acc, a) => acc + a.rating, 0);
                        const avgRating = totalScore / (rev.answers.length || 1);
                        return (
                          <div key={rev.id} className="border border-slate-200 p-3.5 rounded-xl hover:border-indigo-200 transition bg-white text-sans space-y-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-[11px] font-extrabold text-indigo-650">Avaliação Periódica</span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {new Date(rev.date).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-black text-slate-800">
                                <Star className="w-4 h-4 fill-indigo-600 text-indigo-600" />
                                {avgRating.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">/ 5.0</span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 italic">
                              "{rev.generalComment || "Sem parecer escrito geral registrado."}"
                            </p>

                            <div className="grid grid-cols-2 text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded-lg">
                              <span>Produtividade na data: <strong>{rev.productivityMetric || "N/A"} PPH</strong></span>
                              <span>Média Setor: <strong>{rev.sectorAverageMetric || "15.0"} PPH</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      ) : (
        
        /* 📋 QUESTIONS DIRECTORY AND IMPORTATION PANEL */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Add Questions Left Block */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Manual add Form */}
            <form onSubmit={handleAddManualQuestion} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3 text-sans">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-600" /> Nova Pergunta de Competência
              </h3>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Texto da Pergunta</label>
                <input
                  type="text"
                  required
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Ex: Segue os procedimentos de segurança operacional no Torno?"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Categoria</label>
                <select
                  value={newQuestionCategory}
                  onChange={(e) => setNewQuestionCategory(e.target.value)}
                  className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden text-slate-600"
                >
                  <option value="Técnico">🔧 Disciplina / Técnico</option>
                  <option value="Produtividade">📈 Qualidade & Produtividade</option>
                  <option value="Segurança">🛡️ Organização / Segurança</option>
                  <option value="Comportamental">🤝 Comportamental / Liderança</option>
                  <option value="Geral">📝 Geral</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-lg text-xs transition"
              >
                Cadastrar Pergunta Manualmente
              </button>
            </form>

            {/* DOCX Upload integration */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-xl p-4 shadow-3xs space-y-3.5 text-sans">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Upload className="w-4.5 h-4.5 text-indigo-600" /> Importador de Perguntas DOCX
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Faça o upload do formulário de RH em formato de arquivo Microsoft Word (<strong>.docx</strong>). O processador inteligente extrairá as perguntas para incorporação.
              </p>

              <div className="relative border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:bg-indigo-100/80 transition cursor-pointer flex flex-col items-center gap-1.5">
                <input
                  type="file"
                  accept=".docx"
                  disabled={uploadingDocx}
                  onChange={handleDocxUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileText className="w-8 h-8 text-indigo-400" />
                <span className="text-xs font-extrabold text-indigo-700">
                  {uploadingDocx ? "Processando..." : "Selecionar arquivo .DOCX"}
                </span>
                <span className="text-[10px] text-slate-500">Clieque ou arraste e solte</span>
              </div>
            </div>
          </div>

          {/* List existing database questions */}
          <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-slate-800">
              Perguntas e Critérios Cadastrados ({activeQuestions.length})
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {activeQuestions.map((q) => (
                <div key={q.id} className="bg-slate-50/50 border border-slate-250 p-3 rounded-lg flex items-start justify-between gap-3 text-sans">
                  <div className="text-left space-y-1.5">
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                      {q.category}
                    </span>
                    <p className="text-xs font-bold text-slate-700">{q.text}</p>
                  </div>
                  {/* Do not allow deleting system default questions */}
                  {!q.id.startsWith("std-") && (
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-slate-400 hover:text-red-600 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Interactive Modal to Review docx parsed Questions */}
      {showDocxModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg flex flex-col gap-4 max-h-[85vh] text-sans select-none animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" /> Confirmar Perguntas DOCX Extraídas ({parsedDocQuestions.length})
              </h3>
              <button 
                onClick={() => { setShowDocxModal(false); setParsedDocQuestions([]); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500">
              Selecione quais parágrafos ou enunciados do Word e clique em "Importar Selecionados". Eles farão parte do questionário.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const fData = new FormData(e.currentTarget);
              const selected = fData.getAll("docx_q") as string[];
              handleImportDocxQuestions(selected);
            }} className="flex flex-col gap-4 overflow-hidden">
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">
                {parsedDocQuestions.map((text, idx) => (
                  <label key={idx} className="flex gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      name="docx_q"
                      value={text}
                      defaultChecked
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{text}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-lg transition"
                >
                  Importar Enunciados Selecionados
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDocxModal(false); setParsedDocQuestions([]); }}
                  className="bg-white border border-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg text-xs"
                >
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
