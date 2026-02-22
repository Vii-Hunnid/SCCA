"use client";

import React, { useState, useEffect, useCallback } from "react";

// ============================================
// SCCA API Tester - Interactive Testing Interface
// Location: /scca/test
// ============================================

interface Endpoint {
  id: string;
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  category: "vault" | "conversations" | "account" | "keys" | "usage" | "billing" | "media" | "system";
  body?: Record<string, unknown>;
  params?: { name: string; type: string; required: boolean; description: string }[];
}

const ENDPOINTS: Endpoint[] = [
  // Vault Endpoints
  {
    id: "vault-encrypt",
    name: "Encrypt Data",
    method: "POST",
    path: "/api/scca/vault/encrypt",
    description: "Encrypt data with AES-256-GCM",
    category: "vault",
    body: { data: ["Hello, World!"], context: "test-context" },
  },
  {
    id: "vault-decrypt",
    name: "Decrypt Data",
    method: "POST",
    path: "/api/scca/vault/decrypt",
    description: "Decrypt SCCA tokens back to plaintext",
    category: "vault",
    body: { tokens: ["paste_token_here"], context: "test-context" },
  },
  {
    id: "vault-verify",
    name: "Verify Integrity",
    method: "POST",
    path: "/api/scca/vault/verify",
    description: "Verify Merkle-HMAC integrity of encrypted data",
    category: "vault",
    body: { tokens: ["token1", "token2"], merkleRoot: "root_hash", context: "test-context" },
  },

  // Conversation Endpoints
  {
    id: "conv-list",
    name: "List Conversations",
    method: "GET",
    path: "/api/scca/conversations",
    description: "Get all conversations for the authenticated user",
    category: "conversations",
  },
  {
    id: "conv-create",
    name: "Create Conversation",
    method: "POST",
    path: "/api/scca/conversations",
    description: "Create a new conversation",
    category: "conversations",
    body: { title: "New Chat", model: "gpt-4o-mini" },
  },
  {
    id: "conv-get",
    name: "Get Conversation",
    method: "GET",
    path: "/api/scca/conversations/{id}",
    description: "Get a specific conversation by ID",
    category: "conversations",
    params: [{ name: "id", type: "string", required: true, description: "Conversation ID" }],
  },
  {
    id: "conv-update",
    name: "Update Conversation",
    method: "PATCH",
    path: "/api/scca/conversations/{id}",
    description: "Update conversation title",
    category: "conversations",
    body: { title: "Updated Title" },
    params: [{ name: "id", type: "string", required: true, description: "Conversation ID" }],
  },
  {
    id: "conv-delete",
    name: "Delete Conversation",
    method: "DELETE",
    path: "/api/scca/conversations/{id}",
    description: "Delete a conversation",
    category: "conversations",
    params: [{ name: "id", type: "string", required: true, description: "Conversation ID" }],
  },
  {
    id: "conv-messages",
    name: "Send Message",
    method: "POST",
    path: "/api/scca/conversations/{id}/messages",
    description: "Send a message in a conversation",
    category: "conversations",
    body: { content: "Hello, how are you?" },
    params: [{ name: "id", type: "string", required: true, description: "Conversation ID" }],
  },
  {
    id: "conv-edit",
    name: "Edit Message",
    method: "PATCH",
    path: "/api/scca/conversations/{id}/edit",
    description: "Edit a message in a conversation",
    category: "conversations",
    body: { sequence: 1, newContent: "Updated message content" },
    params: [{ name: "id", type: "string", required: true, description: "Conversation ID" }],
  },

  // Account Endpoints
  {
    id: "account-get",
    name: "Get Account",
    method: "GET",
    path: "/api/scca/account",
    description: "Get current user profile and sessions",
    category: "account",
  },
  {
    id: "account-update",
    name: "Update Account",
    method: "PATCH",
    path: "/api/scca/account",
    description: "Update user profile (name only)",
    category: "account",
    body: { name: "New Name" },
  },
  {
    id: "account-delete",
    name: "Delete Account",
    method: "DELETE",
    path: "/api/scca/account",
    description: "Delete user account and all data",
    category: "account",
  },
  {
    id: "account-password",
    name: "Change Password",
    method: "POST",
    path: "/api/scca/account/password",
    description: "Change account password",
    category: "account",
    body: { currentPassword: "old_pass", newPassword: "new_pass" },
  },
  {
    id: "account-sessions",
    name: "Delete Session",
    method: "DELETE",
    path: "/api/scca/account/sessions/{id}",
    description: "Delete a specific session",
    category: "account",
    params: [{ name: "id", type: "string", required: true, description: "Session ID" }],
  },

  // API Keys Endpoints
  {
    id: "keys-list",
    name: "List API Keys",
    method: "GET",
    path: "/api/scca/keys",
    description: "List all API keys (without secrets)",
    category: "keys",
  },
  {
    id: "keys-create",
    name: "Create API Key",
    method: "POST",
    path: "/api/scca/keys",
    description: "Generate a new API key (shown once)",
    category: "keys",
    body: { name: "My API Key", expiresInDays: 30 },
  },
  {
    id: "keys-delete",
    name: "Revoke API Key",
    method: "DELETE",
    path: "/api/scca/keys/{id}",
    description: "Revoke an API key",
    category: "keys",
    params: [{ name: "id", type: "string", required: true, description: "Key ID" }],
  },

  // Usage Endpoints
  {
    id: "usage-get",
    name: "Get Usage Stats",
    method: "GET",
    path: "/api/scca/usage",
    description: "Get usage analytics (1h, 24h, 7d, 30d)",
    category: "usage",
    params: [{ name: "period", type: "query", required: false, description: "1h, 24h, 7d, or 30d" }],
  },
  {
    id: "rate-limits",
    name: "Get Rate Limits",
    method: "GET",
    path: "/api/scca/rate-limits",
    description: "Get current rate limit status",
    category: "usage",
  },

  // Billing Endpoints
  {
    id: "billing-get",
    name: "Get Billing Info",
    method: "GET",
    path: "/api/scca/billing",
    description: "Get billing account, tier, and invoices",
    category: "billing",
  },
  {
    id: "billing-update",
    name: "Update Billing",
    method: "POST",
    path: "/api/scca/billing",
    description: "Update billing settings",
    category: "billing",
    body: { monthlyBudgetMicro: 10000000, autoUpgrade: false },
  },
  {
    id: "billing-invoices",
    name: "List Invoices",
    method: "GET",
    path: "/api/scca/billing/invoices",
    description: "Get all invoices",
    category: "billing",
  },
  {
    id: "billing-checkout",
    name: "Create Checkout",
    method: "POST",
    path: "/api/scca/billing/checkout",
    description: "Create a checkout session for upgrading",
    category: "billing",
    body: { tier: "pro" },
  },

  // Media Endpoints
  {
    id: "media-list",
    name: "List Media",
    method: "GET",
    path: "/api/scca/media",
    description: "List media for a conversation",
    category: "media",
    params: [{ name: "conversationId", type: "query", required: true, description: "Conversation ID" }],
  },
  {
    id: "media-upload",
    name: "Upload Media",
    method: "POST",
    path: "/api/scca/media",
    description: "Upload and encrypt a media file",
    category: "media",
  },

  // System
  {
    id: "health",
    name: "Health Check",
    method: "GET",
    path: "/api/health",
    description: "Check API health status",
    category: "system",
  },
];

const CATEGORIES: Record<string, { label: string; color: string }> = {
  vault: { label: "🔐 Vault", color: "bg-emerald-600" },
  conversations: { label: "💬 Conversations", color: "bg-blue-600" },
  account: { label: "👤 Account", color: "bg-purple-600" },
  keys: { label: "🔑 API Keys", color: "bg-yellow-600" },
  usage: { label: "📊 Usage", color: "bg-cyan-600" },
  billing: { label: "💳 Billing", color: "bg-pink-600" },
  media: { label: "🖼️ Media", color: "bg-orange-600" },
  system: { label: "⚙️ System", color: "bg-gray-600" },
};

const METHOD_COLORS = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PATCH: "bg-yellow-500",
  DELETE: "bg-red-500",
};

interface RequestHistory {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latency: number;
  success: boolean;
}

interface BatchResult {
  success: boolean;
  status: number;
  latency: number;
  error?: string;
}

export default function SCCATestPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState("");
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<unknown>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"body" | "params" | "headers">("body");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    vault: true,
    conversations: false,
    account: false,
    keys: false,
    usage: false,
    billing: false,
    media: false,
    system: false,
  });

  // Batch testing state
  const [batchCount, setBatchCount] = useState(10);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("scca_test_api_key");
    if (savedKey) setApiKey(savedKey);
    
    const savedHistory = localStorage.getItem("scca_test_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("scca_test_api_key", apiKey);
    }
  }, [apiKey]);

  // Update request body when endpoint changes
  useEffect(() => {
    if (selectedEndpoint.body) {
      setRequestBody(JSON.stringify(selectedEndpoint.body, null, 2));
    } else {
      setRequestBody("");
    }
    setPathParams({});
    setQueryParams({});
    setResponse(null);
    setError(null);
  }, [selectedEndpoint]);

  const addToHistory = useCallback((entry: RequestHistory) => {
    setHistory((prev) => {
      const newHistory = [entry, ...prev].slice(0, 50);
      localStorage.setItem("scca_test_history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const buildUrl = (endpoint: Endpoint) => {
    let url = endpoint.path;
    
    // Replace path params
    if (endpoint.params) {
      endpoint.params.forEach((param) => {
        if (param.type !== "query") {
          const value = pathParams[param.name] || `{${param.name}}`;
          url = url.replace(`{${param.name}}`, value);
        }
      });
    }

    // Add query params
    const queryParts: string[] = [];
    if (endpoint.params) {
      endpoint.params.forEach((param) => {
        if (param.type === "query" && queryParams[param.name]) {
          queryParts.push(`${param.name}=${encodeURIComponent(queryParams[param.name])}`);
        }
      });
    }
    if (queryParts.length > 0) {
      url += `?${queryParts.join("&")}`;
    }

    return url;
  };

  const makeRequest = async (): Promise<{ success: boolean; status: number; latency: number; error?: string }> => {
    const url = buildUrl(selectedEndpoint);
    const startTime = performance.now();
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const options: RequestInit = {
      method: selectedEndpoint.method,
      headers,
    };

    if (selectedEndpoint.method !== "GET" && selectedEndpoint.method !== "DELETE" && requestBody) {
      try {
        // Validate JSON
        JSON.parse(requestBody);
        options.body = requestBody;
      } catch (e) {
        setError("Invalid JSON in request body");
        return { success: false, status: 0, latency: 0, error: "Invalid JSON" };
      }
    }

    try {
      const res = await fetch(url, options);
      const latency = Math.round(performance.now() - startTime);
      const data = await res.json().catch(() => null);
      
      setResponse(data);
      setResponseStatus(res.status);
      setResponseTime(latency);
      
      const historyEntry: RequestHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        method: selectedEndpoint.method,
        path: url,
        status: res.status,
        latency,
        success: res.ok,
      };
      addToHistory(historyEntry);

      return { success: res.ok, status: res.status, latency };
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setError(err.message || "Request failed");
      setResponse(null);
      return { success: false, status: 0, latency, error: err.message };
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    await makeRequest();
    
    setLoading(false);
  };

  const runBatchTest = async () => {
    if (batchCount < 1 || batchCount > 100) {
      setError("Batch count must be between 1 and 100");
      return;
    }

    setBatchRunning(true);
    setBatchResults([]);
    setBatchProgress(0);
    setError(null);

    const results: BatchResult[] = [];
    
    for (let i = 0; i < batchCount; i++) {
      const result = await makeRequest();
      results.push(result);
      setBatchProgress(i + 1);
      setBatchResults([...results]);
      
      // Small delay to prevent overwhelming the server
      if (i < batchCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setBatchRunning(false);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getCategoryEndpoints = (category: string) => {
    return ENDPOINTS.filter((e) => e.category === category);
  };

  const batchStats = {
    total: batchResults.length,
    success: batchResults.filter((r) => r.success).length,
    failed: batchResults.filter((r) => !r.success).length,
    avgLatency: batchResults.length > 0 
      ? Math.round(batchResults.reduce((a, b) => a + b.latency, 0) / batchResults.length)
      : 0,
    successRate: batchResults.length > 0
      ? Math.round((batchResults.filter((r) => r.success).length / batchResults.length) * 100)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">🔧 SCCA API Tester</h1>
              <p className="text-sm text-gray-400 mt-1">
                Test all SCCA API endpoints interactively
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">API Base URL</div>
                <div className="text-emerald-400 font-mono text-sm">/api/scca</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* API Key Section */}
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">API Authentication</h2>
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {loading ? "Testing..." : "Test Connection"}
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your SCCA API key (scca_...)"
                className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            API key is stored in localStorage only and sent directly to SCCA API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Endpoint List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Endpoints
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {Object.entries(CATEGORIES).map(([key, { label, color }]) => {
                const endpoints = getCategoryEndpoints(key);
                if (endpoints.length === 0) return null;
                
                return (
                  <div key={key} className="border border-gray-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(key)}
                      className="w-full px-3 py-2 bg-gray-900 flex items-center justify-between hover:bg-gray-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </span>
                      <span className="text-gray-500">
                        {expandedCategories[key] ? "▼" : "▶"}
                      </span>
                    </button>
                    {expandedCategories[key] && (
                      <div className="divide-y divide-gray-800">
                        {endpoints.map((endpoint) => (
                          <button
                            key={endpoint.id}
                            onClick={() => setSelectedEndpoint(endpoint)}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              selectedEndpoint.id === endpoint.id
                                ? "bg-emerald-900/30 text-emerald-400"
                                : "bg-gray-950 hover:bg-gray-900 text-gray-300"
                            }`}
                          >
                            <span className={`inline-block w-12 text-xs font-mono ${
                              endpoint.method === "GET" ? "text-blue-400" :
                              endpoint.method === "POST" ? "text-green-400" :
                              endpoint.method === "PATCH" ? "text-yellow-400" :
                              "text-red-400"
                            }`}>
                              {endpoint.method}
                            </span>
                            <span className="truncate">{endpoint.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Endpoint Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${METHOD_COLORS[selectedEndpoint.method]}`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-emerald-400 font-mono">{buildUrl(selectedEndpoint)}</code>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{selectedEndpoint.name}</h2>
                  <p className="text-gray-400 mt-1">{selectedEndpoint.description}</p>
                </div>
              </div>
            </div>

            {/* Request Builder */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="flex border-b border-gray-800">
                {["body", "params", "headers"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "bg-gray-800 text-emerald-400 border-b-2 border-emerald-500"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === "body" && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Request Body (JSON)</label>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      disabled={selectedEndpoint.method === "GET" || selectedEndpoint.method === "DELETE"}
                      className="w-full h-48 px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg font-mono text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="{}"
                    />
                    {selectedEndpoint.method === "GET" || selectedEndpoint.method === "DELETE" ? (
                      <p className="text-xs text-gray-500 mt-2">Body not sent for GET/DELETE requests</p>
                    ) : null}
                  </div>
                )}

                {activeTab === "params" && (
                  <div className="space-y-4">
                    {selectedEndpoint.params?.map((param) => (
                      <div key={param.name}>
                        <label className="block text-sm text-gray-400 mb-1">
                          {param.name}
                          {param.required && <span className="text-red-400 ml-1">*</span>}
                          <span className="text-xs text-gray-600 ml-2">({param.type})</span>
                        </label>
                        <input
                          type="text"
                          value={param.type === "query" ? queryParams[param.name] || "" : pathParams[param.name] || ""}
                          onChange={(e) => {
                            if (param.type === "query") {
                              setQueryParams({ ...queryParams, [param.name]: e.target.value });
                            } else {
                              setPathParams({ ...pathParams, [param.name]: e.target.value });
                            }
                          }}
                          placeholder={param.description}
                          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                      </div>
                    ))}
                    {(!selectedEndpoint.params || selectedEndpoint.params.length === 0) && (
                      <p className="text-gray-500 text-center py-8">No parameters required for this endpoint</p>
                    )}
                  </div>
                )}

                {activeTab === "headers" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Custom Headers</span>
                      <button
                        onClick={() => setCustomHeaders({ ...customHeaders, "": "" })}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        + Add Header
                      </button>
                    </div>
                    {Object.entries(customHeaders).map(([key, value], index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => {
                            const newHeaders = { ...customHeaders };
                            delete newHeaders[key];
                            newHeaders[e.target.value] = value;
                            setCustomHeaders(newHeaders);
                          }}
                          placeholder="Header name"
                          className="flex-1 px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setCustomHeaders({ ...customHeaders, [key]: e.target.value })}
                          placeholder="Header value"
                          className="flex-1 px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => {
                            const newHeaders = { ...customHeaders };
                            delete newHeaders[key];
                            setCustomHeaders(newHeaders);
                          }}
                          className="px-3 py-2 text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {Object.keys(customHeaders).length === 0 && (
                      <p className="text-gray-500 text-center py-8">No custom headers</p>
                    )}
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {responseTime !== null && (
                    <span className="text-sm text-gray-400">
                      ⏱️ {responseTime}ms
                    </span>
                  )}
                  {responseStatus !== null && (
                    <span className={`text-sm font-medium ${
                      responseStatus < 400 ? "text-green-400" : "text-red-400"
                    }`}>
                      Status: {responseStatus}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {loading ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>

            {/* Batch Testing */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Batch Testing</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400">Requests:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={runBatchTest}
                  disabled={batchRunning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {batchRunning ? `Running (${batchProgress}/${batchCount})...` : "Run Batch Test"}
                </button>
              </div>

              {batchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-gray-950 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-400">{batchStats.success}</div>
                      <div className="text-xs text-gray-500">Success</div>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-400">{batchStats.failed}</div>
                      <div className="text-xs text-gray-500">Failed</div>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-400">{batchStats.avgLatency}ms</div>
                      <div className="text-xs text-gray-500">Avg Latency</div>
                    </div>
                    <div className="bg-gray-950 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-400">{batchStats.successRate}%</div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${batchStats.successRate}%` }}
                    />
                  </div>

                  {/* Individual results */}
                  <div className="max-h-40 overflow-y-auto bg-gray-950 rounded-lg p-2">
                    <div className="grid grid-cols-10 gap-1">
                      {batchResults.map((result, i) => (
                        <div
                          key={i}
                          className={`h-6 rounded text-xs flex items-center justify-center ${
                            result.success ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                          }`}
                          title={`Request ${i + 1}: ${result.status} (${result.latency}ms)`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Response */}
            {(response || error) && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-medium">Response</span>
                  {responseStatus && (
                    <span className={`text-sm ${responseStatus < 400 ? "text-green-400" : "text-red-400"}`}>
                      HTTP {responseStatus}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  {error ? (
                    <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
                      {error}
                    </div>
                  ) : (
                    <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-300">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Request History */}
            {history.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-medium">Request History (Last 50)</span>
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem("scca_test_history");
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-950 text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Time</th>
                        <th className="px-4 py-2 text-left">Method</th>
                        <th className="px-4 py-2 text-left">Path</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {history.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-2 text-gray-500">{entry.timestamp}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs font-mono ${
                              entry.method === "GET" ? "text-blue-400" :
                              entry.method === "POST" ? "text-green-400" :
                              entry.method === "PATCH" ? "text-yellow-400" :
                              "text-red-400"
                            }`}>
                              {entry.method}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-300 truncate max-w-xs" title={entry.path}>
                            {entry.path}
                          </td>
                          <td className="px-4 py-2">
                            <span className={entry.success ? "text-green-400" : "text-red-400"}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-400">{entry.latency}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
