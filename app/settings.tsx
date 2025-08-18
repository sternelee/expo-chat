import * as Form from "@/components/ui/Form";
import * as AC from "@bacons/apple-colors";
import { IconSymbol } from "@/components/ui/IconSymbol";
import * as AppIcon from "expo-quick-actions/icon";
import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Button, Alert } from "react-native";
import { getItem, setItem } from "@/lib/async-storage";

export { ErrorBoundary } from "expo-router";

// @ts-expect-error
const HERMES_RUNTIME = global.HermesInternal?.getRuntimeProperties?.() ?? {};
const HERMES_VERSION = HERMES_RUNTIME["OSS Release Version"];
const isStaticHermes = HERMES_RUNTIME["Static Hermes"];

// --- Model Selector ---
const modelsByProvider: Record<string, { id: string; name: string }[]> = {
  OpenAI: [
    { id: "gpt-4o-mini-2024-07-18", name: "GPT-4o Mini" },
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ],
  Anthropic: [
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  ],
  Google: [
    { id: "models/gemini-pro", name: "Gemini Pro" },
    { id: "models/gemini-1.5-pro-latest", name: "Gemini 1.5 Pro" },
  ],
  Groq: [
    { id: "llama3-8b-8192", name: "Llama 3 8B" },
    { id: "llama3-70b-8192", name: "Llama 3 70B" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7b" },
  ],
  Mistral: [
    { id: "open-mistral-7b", name: "Mistral 7B" },
    { id: "open-mixtral-8x7b", name: "Mixtral 8x7B" },
    { id: "mistral-large-latest", name: "Mistral Large" },
  ],
  OpenRouter: [], // User specifies model in text input
  DeepSeek: [
    { id: "deepseek-chat", name: "DeepSeek Chat" },
    { id: "deepseek-coder", name: "DeepSeek Coder" },
  ],
};

function ModelSelector({ provider, selectedModel, onSelectModel }: { provider: string, selectedModel: string, onSelectModel: (model: string) => void }) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const availableModels = modelsByProvider[provider] || [];

  if (availableModels.length === 0) {
    return (
      <Form.Input
        value={selectedModel}
        onChangeText={onSelectModel}
        label="Model Name"
        placeholder="e.g. google/gemini-flash-1.5"
      />
    );
  }

  const selectedModelName = availableModels.find(m => m.id === selectedModel)?.name || "Select a model";

  return (
    <View>
      <TouchableOpacity onPress={() => setPickerOpen(!isPickerOpen)} style={styles.pickerButton}>
        <Text>{selectedModelName}</Text>
        <Text>▼</Text>
      </TouchableOpacity>

      {isPickerOpen && (
        <View style={styles.pickerDropdown}>
          {availableModels.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                onSelectModel(m.id);
                setPickerOpen(false);
              }}
              style={[styles.pickerItem, selectedModel === m.id && styles.selectedPickerItem]}
            >
              <Text>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
// --- End of Model Selector ---


// --- Provider Tab Content ---
const providers = [
  { name: "OpenAI", color: "#10a37f", icon: "O" },
  { name: "Anthropic", color: "#d97706", icon: "A" },
  { name: "Google", color: "#4285f4", icon: "G" },
  { name: "Groq", color: "#f97316", icon: "G" },
  { name: "Mistral", color: "#7c3aed", icon: "M" },
  { name: "OpenRouter", color: "#059669", icon: "O" },
  { name: "DeepSeek", color: "#dc2626", icon: "D" },
];

const PROVIDER_KEY = "ai_provider";
const MODEL_KEY = "ai_model";
const getApiKeyStoreKey = (provider: string) => `${provider.toLowerCase()}_api_key`;
const getBaseUrlStoreKey = (provider: string) => `${provider.toLowerCase()}_base_url`;

function ProviderTab() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0].name);
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showMoreParams, setShowMoreParams] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storedProvider, storedModel] = await Promise.all([
          getItem(PROVIDER_KEY),
          getItem(MODEL_KEY)
      ]);
      if (storedProvider) {
        setSelectedProvider(storedProvider);
      }
      if (storedModel) {
        setSelectedModel(storedModel);
      }
    } catch (error) {
      console.error("Failed to load provider settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProviderData = useCallback(async (provider: string) => {
    try {
      const key = getApiKeyStoreKey(provider);
      const urlKey = getBaseUrlStoreKey(provider);
      const [storedApiKey, storedBaseUrl] = await Promise.all([
        getItem(key),
        getItem(urlKey)
      ]);
      setApiKey(storedApiKey || "");
      setBaseUrl(storedBaseUrl || "");
    } catch (error) {
      console.error("Failed to load provider data:", error);
      setApiKey("");
      setBaseUrl("");
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isLoading) {
      loadProviderData(selectedProvider);
    }
  }, [selectedProvider, isLoading, loadProviderData]);

  const handleProviderSelect = useCallback((provider: string) => {
    setSelectedProvider(provider);
    // Reset model when provider changes, if the current model is not from the new provider
    const availableModels = modelsByProvider[provider] || [];
    if (!availableModels.some(m => m.id === selectedModel)) {
      setSelectedModel(availableModels.length > 0 ? availableModels[0].id : "");
    }
    setShowMoreParams(false); // Reset on provider change
  }, [selectedModel]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter an API key");
      return;
    }

    try {
      setIsSaving(true);
      const tasks = [
        setItem(PROVIDER_KEY, selectedProvider),
        setItem(MODEL_KEY, selectedModel),
        setItem(getApiKeyStoreKey(selectedProvider), apiKey.trim()),
      ];

      if (showMoreParams) {
        tasks.push(setItem(getBaseUrlStoreKey(selectedProvider), baseUrl.trim()));
      }

      await Promise.all(tasks);
      Alert.alert("Success", "Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getProviderColor = (providerName: string) => {
    return providers.find(p => p.name === providerName)?.color || "#6b7280";
  };

  if (isLoading) {
    return (
      <Form.Section title="Loading...">
        <Text>Loading provider settings...</Text>
      </Form.Section>
    );
  }

  return (
    <>
      <Form.Section title="AI Provider">
        <View style={styles.providerGrid}>
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.name}
              style={[
                styles.providerButton,
                {
                  backgroundColor: selectedProvider === provider.name ? provider.color : "#f3f4f6",
                  borderColor: selectedProvider === provider.name ? provider.color : "#d1d5db",
                }
              ]}
              onPress={() => handleProviderSelect(provider.name)}
              activeOpacity={0.7}
            >
              <View style={styles.providerButtonContent}>
                <Text style={[styles.providerIcon, { color: selectedProvider === provider.name ? "white" : provider.color }]}>
                  {provider.icon}
                </Text>
                <Text
                  style={[
                    styles.providerText,
                    { color: selectedProvider === provider.name ? "white" : "#374151" }
                  ]}
                >
                  {provider.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Form.Section>

      <Form.Section title="Model">
        <ModelSelector
            provider={selectedProvider}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
        />
      </Form.Section>

      <Form.Section title={`API Key for ${selectedProvider}`}>
        <Form.Input
          placeholder={`Enter your ${selectedProvider} API key`}
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.apiKeyInput}
        />
        <TouchableOpacity onPress={() => setShowMoreParams(!showMoreParams)} style={styles.moreButton}>
          <Text style={styles.moreButtonText}>{showMoreParams ? "Hide" : "More..."} Parameters</Text>
        </TouchableOpacity>

        {showMoreParams && (
          <View style={styles.moreParamsContainer}>
            <Form.Input
              label="Base URL (optional)"
              placeholder="https://api.example.com"
              value={baseUrl}
              onChangeText={setBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        {!apiKey && (
          <Text style={styles.helperText}>
            Your API key is stored securely on your device
          </Text>
        )}
      </Form.Section>

      <View style={styles.saveButtonContainer}>
        <Button
          title={isSaving ? "Saving..." : "Save Settings"}
          onPress={handleSave}
          disabled={isSaving || !apiKey.trim()}
          color={getProviderColor(selectedProvider)}
        />
      </View>
    </>
  );
}
// --- End of Provider Tab Content ---


// --- MCP Tab Content ---
const MCP_HTTP_URL_KEY = "mcp_http_url";
const MCP_SSE_URL_KEY = "mcp_sse_url";

const validateUrl = (url: string): boolean => {
  if (!url) return true; // Empty URLs are allowed
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

function MCPTab() {
  const [httpUrl, setHttpUrl] = useState("");
  const [sseUrl, setSseUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({ http: "", sse: "" });

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storedHttpUrl, storedSseUrl] = await Promise.all([
        getItem(MCP_HTTP_URL_KEY),
        getItem(MCP_SSE_URL_KEY)
      ]);

      setHttpUrl(storedHttpUrl || "");
      setSseUrl(storedSseUrl || "");
    } catch (error) {
      console.error("Failed to load MCP settings:", error);
      Alert.alert("Error", "Failed to load MCP settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleHttpUrlChange = useCallback((url: string) => {
    setHttpUrl(url);
    setErrors(prev => ({
      ...prev,
      http: url && !validateUrl(url) ? "Invalid URL format" : ""
    }));
  }, []);

  const handleSseUrlChange = useCallback((url: string) => {
    setSseUrl(url);
    setErrors(prev => ({
      ...prev,
      sse: url && !validateUrl(url) ? "Invalid URL format" : ""
    }));
  }, []);

  const handleSave = async () => {
    // Validate URLs before saving
    const httpValid = validateUrl(httpUrl);
    const sseValid = validateUrl(sseUrl);

    if (!httpValid || !sseValid) {
      Alert.alert("Error", "Please fix the invalid URLs before saving");
      return;
    }

    try {
      setIsSaving(true);
      await Promise.all([
        setItem(MCP_HTTP_URL_KEY, httpUrl.trim()),
        setItem(MCP_SSE_URL_KEY, sseUrl.trim())
      ]);
      Alert.alert("Success", "MCP settings saved successfully!");
    } catch (error) {
      console.error("Failed to save MCP settings:", error);
      Alert.alert("Error", "Failed to save MCP settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to clear all MCP settings?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setHttpUrl("");
            setSseUrl("");
            setErrors({ http: "", sse: "" });
          }
        }
      ]
    );
  };

  const hasValidSettings = httpUrl || sseUrl;
  const hasErrors = errors.http || errors.sse;

  if (isLoading) {
    return (
      <Form.Section title="Loading...">
        <Text>Loading MCP settings...</Text>
      </Form.Section>
    );
  }

  return (
    <>
      <Form.Section title="Model Context Protocol (MCP)">
        <Text style={styles.mcpDescription}>
          Configure MCP server endpoints to extend AI capabilities with external tools and data sources.
        </Text>
      </Form.Section>

      <Form.Section title="HTTP Server">
        <Form.Input
          placeholder="https://your-mcp-server.com/api"
          value={httpUrl}
          onChangeText={handleHttpUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.mcpInput, errors.http && styles.mcpInputError]}
        />
        {errors.http ? (
          <Text style={styles.mcpErrorText}>{errors.http}</Text>
        ) : (
          <Text style={styles.helperText}>
            HTTP endpoint for MCP server communication
          </Text>
        )}
      </Form.Section>

      <Form.Section title="Server-Sent Events (SSE) Server">
        <Form.Input
          placeholder="https://your-mcp-server.com/sse"
          value={sseUrl}
          onChangeText={handleSseUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.mcpInput, errors.sse && styles.mcpInputError]}
        />
        {errors.sse ? (
          <Text style={styles.mcpErrorText}>{errors.sse}</Text>
        ) : (
          <Text style={styles.helperText}>
            SSE endpoint for real-time server communication
          </Text>
        )}
      </Form.Section>

      <View style={styles.mcpButtonContainer}>
        <View style={styles.mcpButtonRow}>
          <View style={styles.mcpButton}>
            <Button
              title={isSaving ? "Saving..." : "Save Settings"}
              onPress={handleSave}
              disabled={isSaving || hasErrors}
              color="#059669"
            />
          </View>
          {hasValidSettings && (
            <View style={styles.mcpButton}>
              <Button
                title="Reset"
                onPress={handleReset}
                disabled={isSaving}
                color="#dc2626"
              />
            </View>
          )}
        </View>
      </View>

      {hasValidSettings && (
        <Form.Section title="Connection Status">
          <Text style={styles.mcpStatusText}>
            {httpUrl && sseUrl
              ? "Both HTTP and SSE endpoints configured"
              : httpUrl
                ? "HTTP endpoint configured"
                : "SSE endpoint configured"}
          </Text>
        </Form.Section>
      )}
    </>
  );
}
// --- End of MCP Tab Content ---

// --- Tools Tab Content ---
const tools = [
  { name: "Discord", id: "discord", apiKeyNeeded: false },
  { name: "Exa AI", id: "exa-ai", apiKeyNeeded: true, keyName: "EXA_API_KEY" },
  { name: "Fal", id: "fal", apiKeyNeeded: true, keyName: "FAL_API_KEY" },
  { name: "Giphy", id: "giphy", apiKeyNeeded: true, keyName: "GIPHY_API_KEY" },
  { name: "GitHub", id: "github", apiKeyNeeded: false },
  { name: "Math", id: "math", apiKeyNeeded: false },
  { name: "Perplexity", id: "perplexity", apiKeyNeeded: true, keyName: "PERPLEXITY_API_KEY" },
  { name: "Postgres", id: "postgres", apiKeyNeeded: false },
  { name: "Replicate", id: "replicate", apiKeyNeeded: true, keyName: "REPLICATE_API_KEY" },
  { name: "Slack", id: "slack", apiKeyNeeded: false },
  { name: "Tavily", id: "tavily", apiKeyNeeded: true, keyName: "TAVILY_API_KEY" },
  { name: "Telegram", id: "telegram", apiKeyNeeded: false },
  { name: "Vercel", id: "vercel", apiKeyNeeded: false },
];

const getToolEnabledKey = (toolId: string) => `tool_${toolId}_enabled`;
const getToolApiKeyStoreKey = (toolId: string) => `tool_${toolId}_api_key`;

function ToolsTab() {
  const [toolSettings, setToolSettings] = useState<Record<string, { enabled: boolean; apiKey: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadToolSettings = useCallback(async () => {
    setIsLoading(true);
    const newSettings: Record<string, { enabled: boolean; apiKey: string }> = {};
    for (const tool of tools) {
      const enabledKey = getToolEnabledKey(tool.id);
      const apiKeyKey = getToolApiKeyStoreKey(tool.id);
      const [isEnabled, apiKey] = await Promise.all([
        getItem(enabledKey),
        getItem(apiKeyKey),
      ]);
      newSettings[tool.id] = {
        enabled: isEnabled === 'true',
        apiKey: apiKey || '',
      };
    }
    setToolSettings(newSettings);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadToolSettings();
  }, [loadToolSettings]);

  const handleToggle = async (toolId: string, value: boolean) => {
    const newSettings = { ...toolSettings, [toolId]: { ...toolSettings[toolId], enabled: value } };
    setToolSettings(newSettings);
    await setItem(getToolEnabledKey(toolId), value.toString());
  };

  const handleApiKeyChange = (toolId: string, value: string) => {
    const newSettings = { ...toolSettings, [toolId]: { ...toolSettings[toolId], apiKey: value } };
    setToolSettings(newSettings);
  };

  const handleApiKeySave = async (toolId: string) => {
    const key = toolSettings[toolId]?.apiKey;
    if (key) {
      await setItem(getToolApiKeyStoreKey(toolId), key);
      Alert.alert("Success", `${tools.find(t => t.id === toolId)?.name} API key saved!`);
    }
  };

  if (isLoading) {
    return (
      <Form.Section title="Loading...">
        <Text>Loading tool settings...</Text>
      </Form.Section>
    );
  }

  return (
    <Form.Section title="Available Tools">
      {tools.map(tool => (
        <View key={tool.id} style={styles.toolContainer}>
          <View style={styles.toolHeader}>
            <Text style={styles.toolName}>{tool.name}</Text>
            <Form.Switch
              value={toolSettings[tool.id]?.enabled || false}
              onValueChange={(value) => handleToggle(tool.id, value)}
            />
          </View>
          {tool.apiKeyNeeded && toolSettings[tool.id]?.enabled && (
            <View style={styles.apiKeyContainer}>
              <Form.Input
                placeholder={`Enter ${tool.name} API Key`}
                value={toolSettings[tool.id]?.apiKey || ''}
                onChangeText={(value) => handleApiKeyChange(tool.id, value)}
                secureTextEntry
              />
              <Button title="Save" onPress={() => handleApiKeySave(tool.id)} />
            </View>
          )}
        </View>
      ))}
    </Form.Section>
  );
}
// --- End of Tools Tab Content ---

type Tab = "Provider" | "MCP" | "Tools";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("Provider");

  const renderTabContent = () => {
    switch (activeTab) {
      case "Provider":
        return <ProviderTab />;
      case "MCP":
        return <MCPTab />;
      case "Tools":
        return <ToolsTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <Form.List
        contentContainerStyle={{
          padding: 16,
          gap: 24,
          paddingBottom: 64,
        }}
        contentInset={{
          bottom: 24,
        }}
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "Provider" && styles.activeTab]}
            onPress={() => setActiveTab("Provider")}
          >
            <Text style={[styles.tabText, activeTab === "Provider" && styles.activeTabText]}>
              Provider
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "MCP" && styles.activeTab]}
            onPress={() => setActiveTab("MCP")}
          >
            <Text style={[styles.tabText, activeTab === "MCP" && styles.activeTabText]}>
              MCP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "Tools" && styles.activeTab]}
            onPress={() => setActiveTab("Tools")}
          >
            <Text style={[styles.tabText, activeTab === "Tools" && styles.activeTabText]}>
              Tools
            </Text>
          </TouchableOpacity>
        </View>

        {renderTabContent()}

        {process.env.EXPO_OS !== "web" && AppIcon?.isSupported && (
          <Form.Section title="Style">
            <Form.Link href="/settings/icon">App Icon</Form.Link>
          </Form.Section>
        )}

        {HERMES_VERSION && (
          <Form.Section title="Hermes">
            <Form.Text hint={HERMES_VERSION}>Version</Form.Text>
            <Form.Text
              hint={
                !!isStaticHermes ? (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    color={AC.systemGreen}
                  />
                ) : (
                  <IconSymbol name="slash.circle" color={AC.systemGray} />
                )
              }
            >
              Static Hermes
            </Form.Text>
          </Form.Section>
        )}

        <Form.Section>
          <Form.Link href="/_debug" systemImage={"ladybug"}>
            Debug
          </Form.Link>
          <Form.Link href="/_sitemap">/_sitemap</Form.Link>
        </Form.Section>
      </Form.List>
    </>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  activeTabText: {
    color: "#1f2937",
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 8,
  },
  providerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 80,
    alignItems: "center",
  },
  providerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  providerIcon: {
    fontSize: 16,
    fontWeight: "bold",
  },
  providerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  apiKeyInput: {
    marginVertical: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  saveButtonContainer: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  moreButton: {
    paddingVertical: 8,
  },
  moreButtonText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  moreParamsContainer: {
    marginTop: 12,
    gap: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  pickerDropdown: {
    marginTop: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
  },
  pickerItem: {
    padding: 12,
    borderRadius: 6,
  },
  selectedPickerItem: {
    backgroundColor: '#dbeafe',
  },
  mcpDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 8,
  },
  mcpInput: {
    marginVertical: 4,
  },
  mcpInputError: {
    borderColor: "#dc2626",
    borderWidth: 1,
  },
  mcpErrorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
  },
  mcpButtonContainer: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  mcpButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  mcpButton: {
    flex: 1,
  },
  mcpStatusText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "500",
  },
  toolContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '500',
  },
  apiKeyContainer: {
    marginTop: 8,
    gap: 8,
  }
});
