import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { Customer, Order } from "./types";
import {
  Users,
  Search,
  Edit2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  X,
  Check,
  ArrowUpDown,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function GestaoClientesScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: any;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [cityFilter, setCityFilter] = useState("");
  const [ufFilter, setUfFilter] = useState("");
  const [sortField, setSortField] = useState<"id" | "name" | "address">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Custom states for view / select Detail Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Add Customer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerTradeName, setNewCustomerTradeName] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [newCustomerUF, setNewCustomerUF] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    let customId: number | undefined = undefined;
    if (newCustomerId.trim()) {
      const parsedId = parseInt(newCustomerId.trim(), 10);
      if (isNaN(parsedId) || parsedId <= 0) {
        alert("O código do cliente deve ser um número inteiro positivo válido.");
        return;
      }
      if (db.customers.some((c) => c.id === parsedId)) {
        alert(`O código do cliente ${parsedId} já está em uso por outro cliente.`);
        return;
      }
      customId = parsedId;
    }

    let finalTradeName = newCustomerTradeName.trim();
    if (!finalTradeName) {
      finalTradeName = newCustomerName.trim().split(" ").slice(0, 3).join(" ");
    }

    const city = newCustomerCity.trim();
    const uf = newCustomerUF.trim().toUpperCase();
    const address = city && uf ? `${city} - ${uf}` : city || uf || "";

    await db.addCustomer({
      ...(customId !== undefined ? { id: customId } : {}),
      name: newCustomerName.trim(),
      tradeName: finalTradeName,
      address,
      phone: newCustomerPhone.trim(),
      email: newCustomerEmail.trim().toLowerCase(),
    });

    setIsAddModalOpen(false);
    setNewCustomerId("");
    setNewCustomerName("");
    setNewCustomerTradeName("");
    setNewCustomerCity("");
    setNewCustomerUF("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
  };

  // Editing Row State (Inline Quick-Edit)
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineEditNewId, setInlineEditNewId] = useState("");
  const [inlineEditName, setInlineEditName] = useState("");
  const [inlineEditTradeName, setInlineEditTradeName] = useState("");
  const [inlineEditCity, setInlineEditCity] = useState("");
  const [inlineEditUF, setInlineEditUF] = useState("");
  const [inlineEditPhone, setInlineEditPhone] = useState("");
  const [inlineEditEmail, setInlineEditEmail] = useState("");

  // Creative Mock Coordinate mappings for key cities to make map indicators look authentic:
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    ubá: { lat: -21.1201, lng: -42.9424 },
    rodeiro: { lat: -21.2003, lng: -42.8594 },
    "senador firmino": { lat: -20.9163, lng: -43.1025 },
    "visconde do rio branco": { lat: -21.0116, lng: -42.8359 },
    guiricema: { lat: -21.0163, lng: -42.6775 },
    "rio pomba": { lat: -21.2741, lng: -43.1788 },
    miraí: { lat: -21.0112, lng: -42.6108 },
    coimbra: { lat: -20.8407, lng: -42.8021 },
    contagem: { lat: -19.9328, lng: -44.0539 },
    "belo horizonte": { lat: -19.9167, lng: -43.9345 },
    "juiz de fora": { lat: -21.7642, lng: -43.3496 },
    guidoval: { lat: -21.1444, lng: -42.7933 },
    "astolfo dutra": { lat: -21.3146, lng: -42.8624 },
    divinésia: { lat: -20.9859, lng: -43.0456 },
    "são geraldo": { lat: -20.9234, lng: -42.8427 },
  };

  const getCoordinatesForAddress = (address?: string) => {
    if (!address) return { lat: -21.1201, lng: -42.9424 }; // Default to Ubá, MG
    const clean = address.toLowerCase();
    for (const city of Object.keys(cityCoordinates)) {
      if (clean.includes(city)) {
        return cityCoordinates[city];
      }
    }
    // Deterministic random-looking offset based on name hash for unique coordinates
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (hash % 100) / 1000;
    const lngOffset = ((hash >> 4) % 100) / 1000;
    return { lat: -21.12 + latOffset, lng: -42.94 + lngOffset };
  };

  // Extract unique cities and states for filter dropdown lists
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const ufs = new Set<string>();

    db.customers.forEach((c) => {
      if (c.address && c.address.includes(" - ")) {
        const parts = c.address.split(" - ");
        if (parts[0]?.trim()) cities.add(parts[0].trim());
        if (parts[1]?.trim()) ufs.add(parts[1].trim().toUpperCase());
      } else if (c.address?.trim()) {
        cities.add(c.address.trim());
      }
    });

    return {
      cities: Array.from(cities).sort(),
      ufs: Array.from(ufs).sort(),
    };
  }, [db.customers]);

  // Handle Order association count
  const customerStats = useMemo(() => {
    const stats: Record<
      string,
      { totalOrders: number; activeOrders: number; totalItems: number }
    > = {};

    db.orders.forEach((o: Order) => {
      const cName = o.customerName.toLowerCase().trim();
      const current = stats[cName] || {
        totalOrders: 0,
        activeOrders: 0,
        totalItems: 0,
      };
      current.totalOrders += 1;
      if (o.isActive) current.activeOrders += 1;
      current.totalItems += o.totalQuantity || 0;
      stats[cName] = current;
    });

    return stats;
  }, [db.orders]);

  // Handle Sort Toggle
  const handleSort = (field: "id" | "name" | "address") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Search, filter and sorting calculation
  const filteredCustomers = useMemo(() => {
    return db.customers
      .filter((c) => {
        const codeStr = String(c.id || "");
        const nameLower = (c.name || "").toLowerCase();
        const tradeLower = (c.tradeName || "").toLowerCase();
        const addrLower = (c.address || "").toLowerCase();
        const phoneLower = (c.phone || "").toLowerCase();
        const emailLower = (c.email || "").toLowerCase();

        // Standard search term matching
        const matchesSearch =
          codeStr.includes(debouncedSearchTerm.toLowerCase()) ||
          nameLower.includes(debouncedSearchTerm.toLowerCase()) ||
          tradeLower.includes(debouncedSearchTerm.toLowerCase()) ||
          addrLower.includes(debouncedSearchTerm.toLowerCase()) ||
          phoneLower.includes(debouncedSearchTerm.toLowerCase()) ||
          emailLower.includes(debouncedSearchTerm.toLowerCase());

        // Dropdown specific filters
        let matchesCity = true;
        let matchesUF = true;

        if (cityFilter) {
          matchesCity = addrLower.includes(cityFilter.toLowerCase());
        }
        if (ufFilter) {
          matchesUF =
            addrLower.split(" - ")[1]?.trim().toLowerCase() ===
            ufFilter.toLowerCase();
        }

        return matchesSearch && matchesCity && matchesUF;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "id") {
          return sortOrder === "asc"
            ? (valA || 0) - (valB || 0)
            : (valB || 0) - (valA || 0);
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();

        return sortOrder === "asc"
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
  }, [
    db.customers,
    debouncedSearchTerm,
    cityFilter,
    ufFilter,
    sortField,
    sortOrder,
  ]);

  // Pagination bounds
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / itemsPerPage),
  );
  const activePage = Math.min(currentPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, activePage, itemsPerPage]);

  // Trigger quick edit form insertion
  const startQuickEdit = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation(); // Avoid opening details drawer
    setInlineEditId(c.id);
    setInlineEditNewId(c.id.toString());
    setInlineEditName(c.name);
    setInlineEditTradeName(c.tradeName || "");

    let city = "";
    let uf = "";
    if (c.address && c.address.includes(" - ")) {
      const parts = c.address.split(" - ");
      city = parts[0] || "";
      uf = parts[1] || "";
    } else {
      city = c.address || "";
    }

    setInlineEditCity(city);
    setInlineEditUF(uf);
    setInlineEditPhone(c.phone || "");
    setInlineEditEmail(c.email || "");
  };

  // Save changes from quick inline edits
  const saveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineEditName.trim()) return;

    const parsedNewId = parseInt(inlineEditNewId.trim(), 10);
    if (isNaN(parsedNewId) || parsedNewId <= 0) {
      alert("O código do cliente deve ser um número inteiro positivo válido.");
      return;
    }

    if (parsedNewId !== inlineEditId && db.customers.some((c) => c.id === parsedNewId)) {
      alert(`O código do cliente ${parsedNewId} já está em uso por outro cliente.`);
      return;
    }

    const city = inlineEditCity.trim();
    const uf = inlineEditUF.trim().toUpperCase();
    const address = city && uf ? `${city} - ${uf}` : city || uf || "";

    let finalTradeName = inlineEditTradeName.trim();
    if (!finalTradeName) {
      finalTradeName = inlineEditName.trim().split(" ").slice(0, 3).join(" ");
    }

    await db.updateCustomer({
      id: parsedNewId,
      name: inlineEditName.trim(),
      tradeName: finalTradeName,
      address,
      phone: inlineEditPhone.trim(),
      email: inlineEditEmail.trim().toLowerCase(),
    }, inlineEditId!);

    // If currently selected details customer was edited, sync the object state
    if (selectedCustomer?.id === inlineEditId) {
      setSelectedCustomer({
        id: parsedNewId,
        name: inlineEditName.trim(),
        tradeName: finalTradeName,
        address,
        phone: inlineEditPhone.trim(),
        email: inlineEditEmail.trim().toLowerCase(),
      });
    }

    setInlineEditId(null);
  };

  const deleteCustomer = async (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Tem certeza que deseja remover o cliente "${c.name}" (Código: ${c.id})?`,
      )
    ) {
      await db.deleteCustomer(c.id);
      if (selectedCustomer?.id === c.id) {
        setSelectedCustomer(null);
      }
    }
  };

  // Real-time calculated properties for currently selected customer details screen
  const selectedStats = useMemo(() => {
    if (!selectedCustomer)
      return { totalOrders: 0, activeOrders: 0, totalItems: 0 };
    return (
      customerStats[selectedCustomer.name.toLowerCase().trim()] || {
        totalOrders: 0,
        activeOrders: 0,
        totalItems: 0,
      }
    );
  }, [selectedCustomer, customerStats]);

  const selectedOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return db.orders.filter(
      (o: Order) =>
        o.customerName.toLowerCase().trim() ===
        selectedCustomer.name.toLowerCase().trim(),
    );
  }, [selectedCustomer, db.orders]);

  // Export base CSV code generator
  const exportToCSV = () => {
    const headers = [
      "Codigo",
      "Razao Social / Nome",
      "Cidade",
      "UF",
      "Telefone",
      "Email",
    ];
    const rows = db.customers.map((c) => {
      let city = "";
      let uf = "";
      if (c.address && c.address.includes(" - ")) {
        const parts = c.address.split(" - ");
        city = parts[0]?.trim() || "";
        uf = parts[1]?.trim() || "";
      } else {
        city = c.address || "";
      }
      return [c.id, c.name, city, uf, c.phone || "", c.email || ""];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Clientes_Base_Completa_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* HEADER SECTION */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            <h1 className="text-xl font-bold text-gray-800">
              Canais de Atendimento &amp; Gestão de Clientes
            </h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Administre a base completa de {db.customers.length} clientes com
            filtros dinâmicos, edição em linha e mapa de rotas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition shadow-sm"
          >
            <Plus size={14} /> Adicionar Cliente
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:border-gray-400 hover:bg-slate-50 text-gray-600 font-semibold rounded text-xs transition shadow-sm"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-4 border-b border-gray-200 shadow-sm flex flex-wrap items-center gap-3 shrink-0">
        {/* Dynamic Search Box */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Pesquisar por Código, Razão Social, Telefone ou Email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-gray-200 outline-none rounded pl-9 pr-8 py-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* City Select Filter */}
        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 font-medium text-xs rounded px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Filtrar Cidade (Todas)</option>
          {filterOptions.cities.map((cty) => (
            <option key={cty} value={cty}>
              {cty}
            </option>
          ))}
        </select>

        {/* State UF Select Filter */}
        <select
          value={ufFilter}
          onChange={(e) => {
            setUfFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-200 font-medium text-xs rounded px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Filtrar Estado (Todos)</option>
          {filterOptions.ufs.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        {/* Reset Filters */}
        {(searchTerm || cityFilter || ufFilter) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setCityFilter("");
              setUfFilter("");
              setCurrentPage(1);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors px-1"
          >
            <RefreshCw size={12} /> Limpar Filtros
          </button>
        )}

        {/* Row count limiter */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <span>Itens por página:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-200 bg-white p-1 rounded font-semibold text-gray-700 outline-none"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* WORKSPACE & LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* MAIN MASTER TABLE VIEW */}
        <div className="flex-1 flex flex-col overflow-auto p-4 md:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-gray-200 sticky top-0 text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none z-10">
                    <th
                      onClick={() => handleSort("id")}
                      className="py-3.5 px-4 w-20 text-center cursor-pointer hover:bg-slate-100 transition duration-150"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Código{" "}
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("name")}
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition duration-150"
                    >
                      <div className="flex items-center gap-1">
                        Razão Social / Nome de Cadastro{" "}
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("address")}
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition duration-150"
                    >
                      <div className="flex items-center gap-1">
                        Localidade{" "}
                        <ArrowUpDown size={12} className="text-gray-400" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Informação de Contato</th>
                    <th className="py-3.5 px-4 w-28 text-center bg-slate-50">
                      Pedidos
                    </th>
                    <th className="py-3.5 px-4 w-32 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-400"
                      >
                        Nenhum cliente cadastrado atende aos critérios de
                        pesquisa informados.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => {
                      const isEditing = inlineEditId === c.id;
                      const stats = customerStats[
                        c.name.toLowerCase().trim()
                      ] || { totalOrders: 0, activeOrders: 0, totalItems: 0 };

                      // Process address format
                      let pCity = c.address || "";
                      let pUF = "";
                      if (c.address && c.address.includes(" - ")) {
                        const parts = c.address.split(" - ");
                        pCity = parts[0]?.trim() || "";
                        pUF = parts[1]?.trim() || "";
                      }

                      return (
                        <tr
                          key={c.id}
                          onClick={() => !isEditing && setSelectedCustomer(c)}
                          className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${
                            selectedCustomer?.id === c.id
                              ? "bg-blue-50/20 font-medium"
                              : ""
                          }`}
                        >
                          {/* CODE ID CELL */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-gray-500" onClick={(e) => e.stopPropagation()}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={inlineEditNewId}
                                onChange={(e) => setInlineEditNewId(e.target.value)}
                                className="w-20 border border-blue-400 rounded px-1.5 py-0.5 outline-none font-bold text-slate-800 text-center text-xs bg-white focus:ring-1 focus:ring-blue-500"
                                required
                              />
                            ) : (
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] tracking-tight">
                                {c.id}
                              </span>
                            )}
                          </td>

                          {/* NAME SOCIAL OR QUICK EDIT CELL */}
                          <td className="py-3 px-4 max-w-xs md:max-w-sm truncate text-left">
                            {isEditing ? (
                              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  placeholder="Nome / Razão Social"
                                  value={inlineEditName}
                                  onChange={(e) =>
                                    setInlineEditName(e.target.value)
                                  }
                                  className="w-full border border-blue-400 rounded px-1.5 py-0.5 outline-none font-semibold text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                                  required
                                />
                                <input
                                  type="text"
                                  placeholder="Nome Fantasia (Opcional)"
                                  value={inlineEditTradeName}
                                  onChange={(e) =>
                                    setInlineEditTradeName(e.target.value)
                                  }
                                  className="w-full border border-blue-400 rounded px-1.5 py-0.5 outline-none font-semibold text-[10px] focus:ring-1 focus:ring-blue-500 bg-white text-blue-800"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5 text-left">
                                <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                                  {c.name}
                                </span>
                                {c.tradeName && (
                                  <span className="text-[10px] text-blue-650 font-bold bg-blue-50 border border-blue-105/50 px-1 py-0.2 rounded self-start uppercase tracking-wider">
                                    Fantasia: {c.tradeName}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* CITY STATE CELL */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div
                                className="flex gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  placeholder="Cidade"
                                  value={inlineEditCity}
                                  onChange={(e) =>
                                    setInlineEditCity(e.target.value)
                                  }
                                  className="w-2/3 border border-blue-400 rounded px-2 py-1 outline-none text-[11px]"
                                />
                                <input
                                  type="text"
                                  placeholder="UF"
                                  maxLength={2}
                                  value={inlineEditUF}
                                  onChange={(e) =>
                                    setInlineEditUF(e.target.value)
                                  }
                                  className="w-1/3 border border-blue-400 rounded px-1 py-1 text-center uppercase outline-none text-[11px]"
                                />
                              </div>
                            ) : pCity ? (
                              <span className="flex items-center gap-1.5 text-gray-600">
                                <MapPin
                                  size={13}
                                  className="text-gray-400 shrink-0"
                                />
                                <span>{pCity}</span>
                                {pUF && (
                                  <span className="bg-blue-50 border border-blue-100 text-[9px] font-bold text-blue-600 px-1.5 py-0.5 rounded-sm">
                                    {pUF.toUpperCase()}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-300 italic">
                                Preenchimento indefinido
                              </span>
                            )}
                          </td>

                          {/* CONTACT INFO CELL */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div
                                className="flex flex-col gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  placeholder="Telefone"
                                  value={inlineEditPhone}
                                  onChange={(e) =>
                                    setInlineEditPhone(e.target.value)
                                  }
                                  className="border border-blue-400 rounded px-1.5 py-0.5 outline-none text-[11px]"
                                />
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={inlineEditEmail}
                                  onChange={(e) =>
                                    setInlineEditEmail(e.target.value)
                                  }
                                  className="border border-blue-400 rounded px-1.5 py-0.5 outline-none text-[11px]"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5 text-gray-500 text-[11px]">
                                {c.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone
                                      size={11}
                                      className="text-gray-400"
                                    />{" "}
                                    {c.phone}
                                  </span>
                                )}
                                {c.email ? (
                                  <span className="flex items-center gap-1">
                                    <Mail size={11} className="text-gray-400" />{" "}
                                    {c.email}
                                  </span>
                                ) : (
                                  !c.phone && (
                                    <span className="text-gray-300 italic">
                                      Nenhum contato cadastrado
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </td>

                          {/* LINKED ORDERS COUNT */}
                          <td className="py-3 px-4 text-center bg-slate-50/50">
                            {stats.totalOrders > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span
                                  className="text-[11px] font-bold text-gray-800"
                                  title="Total de Pedidos"
                                >
                                  {stats.totalOrders}
                                </span>
                                {stats.activeOrders > 0 && (
                                  <span
                                    className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full"
                                    title="Pedidos Ativos"
                                  >
                                    {stats.activeOrders} Ativos
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>

                          {/* ACTION BUTTONS */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div
                                className="flex items-center gap-1 justify-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={saveQuickEdit}
                                  className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
                                  title="Confirmar alterações"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditId(null)}
                                  className="p-1 hover:bg-rose-50 rounded text-rose-500 transition-colors"
                                  title="Descartar alterações"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-center shrink-0">
                                <button
                                  onClick={(e) => startQuickEdit(e, c)}
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition"
                                  title="Edição Rápida inline"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={(e) => deleteCustomer(e, c)}
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 transition"
                                  title="Remover Cliente"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* MASTER PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="bg-slate-50/70 border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
                <span className="text-gray-500">
                  Exibindo registros de{" "}
                  <span className="font-semibold text-gray-800">
                    {Math.min(
                      filteredCustomers.length,
                      (activePage - 1) * itemsPerPage + 1,
                    )}
                    -
                    {Math.min(
                      filteredCustomers.length,
                      activePage * itemsPerPage,
                    )}
                  </span>{" "}
                  de um total de{" "}
                  <span className="font-semibold text-gray-850 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-blue-705">
                    {filteredCustomers.length}
                  </span>{" "}
                  encontrados
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    className="p-1.5 border border-gray-200 bg-white rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {/* Smart pagination pages list */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const radius = 1;

                    pages.push(1);
                    if (activePage - radius > 2) pages.push("...");

                    const start = Math.max(2, activePage - radius);
                    const end = Math.min(totalPages - 1, activePage + radius);

                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }

                    if (activePage + radius < totalPages - 1) pages.push("...");
                    if (totalPages > 1) pages.push(totalPages);

                    return pages.map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span
                            key={`dots-${idx}`}
                            className="px-1.5 text-gray-400 font-bold select-none text-center"
                          >
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={`page-${p}`}
                          onClick={() => setCurrentPage(Number(p))}
                          className={`px-3 py-1 border rounded-md font-semibold text-xs transition duration-150 ${
                            activePage === p
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={activePage === totalPages}
                    className="p-1.5 border border-gray-200 bg-white rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDE DETAIL SLIDE OUT DRAWER WITH MAP EMBED */}
        <AnimatePresence>
          {selectedCustomer && (
            <motion.div
              initial={{ x: "100%", opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.8 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full md:w-96 lg:w-[450px] bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden shrink-0 z-20 absolute md:relative right-0 top-0 h-full"
            >
              {/* Drawer Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="text-blue-400 shrink-0" size={18} />
                  <div>
                    <h2 className="font-bold text-sm tracking-tight leading-tight uppercase">
                      Ficha Cadastral do Cliente
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {selectedCustomer.id}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Visual Identity section */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4">
                  <div className="bg-blue-600 text-white rounded-lg p-3 text-lg font-extrabold w-12 h-12 flex items-center justify-center shrink-0 shadow-inner">
                    {selectedCustomer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="font-bold text-gray-950 text-base leading-tight">
                      {selectedCustomer.name}
                    </h3>
                    {selectedCustomer.tradeName &&
                      selectedCustomer.tradeName !== selectedCustomer.name && (
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider block w-max mt-0.5">
                          Nome Fantasia: {selectedCustomer.tradeName}
                        </span>
                      )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {selectedCustomer.address || "Sem endereço cadastrado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contacts Panel */}
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Contatos Oficiais
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded hover:bg-slate-100/50 transition duration-155">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-gray-800 select-all">
                        {selectedCustomer.phone || "Nenhum telefone"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded hover:bg-slate-100/50 transition duration-155">
                      <Mail
                        size={14}
                        className="text-slate-400 shrink-0 animate-pulse-slow"
                      />
                      <span className="font-semibold text-gray-800 select-all truncate">
                        {selectedCustomer.email || "Nenhum email cadastrado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* THE MAP INTEGRATION - WITH STATIC MAP / EMBED INDICATING THE CITY */}
                <div className="space-y-2.5 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Localização Geográfica
                    </h4>
                    {selectedCustomer.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCustomer.address)}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                      >
                        Expandir <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {selectedCustomer.address ? (
                    <div className="bg-slate-100 border border-gray-200 rounded-lg overflow-hidden relative shadow-sm h-52">
                      <iframe
                        title={`Mapa indicando a localização de ${selectedCustomer.name}`}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedCustomer.address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="rounded"
                      ></iframe>

                      {/* Beautiful overlay coordinates status tag */}
                      <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white text-[9px] font-mono px-2 py-1 rounded shadow flex items-center gap-2 select-none">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                        <span>
                          LAT:{" "}
                          {getCoordinatesForAddress(
                            selectedCustomer.address,
                          ).lat.toFixed(4)}
                          {" | "}
                          LNG:{" "}
                          {getCoordinatesForAddress(
                            selectedCustomer.address,
                          ).lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-gray-200 rounded-lg py-12 flex flex-col items-center justify-center text-center p-4">
                      <MapPin size={24} className="text-gray-300 mb-2" />
                      <span className="text-xs text-gray-400 font-medium">
                        Não há endereço registrado para exibição do mapa do
                        cliente.
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-450 italic leading-relaxed text-justify">
                    * O mapa exibe a cidade e uf de faturamento cadastrada para
                    orientação logística e definição de rota do representante.
                  </p>
                </div>

                {/* Dynamic Customer Order metrics & details */}
                <div className="space-y-3 border-t border-gray-100 pt-4 pb-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Atividade Comercial
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                      <span className="text-xs text-gray-400 block font-medium">
                        Pedidos
                      </span>
                      <strong className="text-xl font-extrabold text-blue-600 block mt-0.5">
                        {selectedStats.totalOrders}
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                      <span className="text-xs text-gray-400 block font-medium">
                        Ativos
                      </span>
                      <strong className="text-xl font-extrabold text-emerald-600 block mt-0.5">
                        {selectedStats.activeOrders}
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                      <span className="text-xs text-gray-400 block font-medium">
                        Peças
                      </span>
                      <strong className="text-xl font-extrabold text-indigo-600 block mt-0.5">
                        {selectedStats.totalItems}
                      </strong>
                    </div>
                  </div>

                  {/* List of related Orders if any */}
                  {selectedOrders.length > 0 ? (
                    <div className="space-y-2 mt-3 overflow-hidden">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1.5">
                        <FileText size={10} /> Listagem de Lançamentos (
                        {selectedOrders.length})
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                        {selectedOrders.map((ord: Order) => (
                          <div
                            key={ord.id}
                            className="pt-2 flex items-center justify-between text-xs hover:bg-slate-50/50 p-1 rounded"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-gray-800">
                                {ord.orderCode}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {ord.color} / {ord.size}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold block">
                                {ord.totalQuantity} pçs
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  ord.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {ord.isActive ? "Pendente" : "Pronto"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-50 text-slate-400 italic rounded text-xs">
                      Nenhum lançamento de pedido ativo ou histórico detectado
                      para esta Razão Social.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Adicionar Novo Cliente
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Código do Cliente (Opcional - deixe vazio para gerar automaticamente)
                </label>
                <input
                  type="number"
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Ex: 5024"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Nome / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Ex: Moveis Ltda"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Nome Fantasia (Se vazio, adota automaticamente os 3 primeiros nomes)
                </label>
                <input
                  type="text"
                  value={newCustomerTradeName}
                  onChange={(e) => setNewCustomerTradeName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Ex: Moveis Aliança"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={newCustomerCity}
                    onChange={(e) => setNewCustomerCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: Ubá"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={newCustomerUF}
                    onChange={(e) => setNewCustomerUF(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: MG"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
