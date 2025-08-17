import { IconSymbol } from "@/components/ui/IconSymbol";
import { getItem } from "@/lib/async-storage";
import * as AC from "@bacons/apple-colors";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PROVIDER_KEY = "ai_provider";
const getApiKeyStoreKey = (provider: string) => `${provider.toLowerCase()}_api_key`;

const providers = [
  { name: "OpenAI", color: "#10a37f" },
  { name: "Anthropic", color: "#d97706" },
  { name: "Google", color: "#4285f4" },
  { name: "Groq", color: "#f97316" },
  { name: "Mistral", color: "#7c3aed" },
  { name: "OpenRouter", color: "#059669" },
  { name: "DeepSeek", color: "#dc2626" },
];

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

const hardcodedModels: Record<string, ModelInfo[]> = {
  OpenAI: [
    {
      id: "gpt-4o-mini-2024-07-18",
      name: "GPT-4o Mini",
      description: "Fast and efficient model for most tasks",
      context_length: 128000,
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Most capable model with multimodal abilities",
      context_length: 128000,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      description: "Fast and cost-effective for simple tasks",
      context_length: 16385,
    },
  ],
  Anthropic: [
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      description: "Fastest model for simple tasks",
      context_length: 200000,
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      description: "Balanced performance and speed",
      context_length: 200000,
    },
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      description: "Most powerful model for complex tasks",
      context_length: 200000,
    },
  ],
  Google: [
    {
      id: "models/gemini-pro",
      name: "Gemini Pro",
      description: "Google's advanced AI model",
      context_length: 32768,
    },
    {
      id: "models/gemini-1.5-pro-latest",
      name: "Gemini 1.5 Pro",
      description: "Latest version with improved capabilities",
      context_length: 1000000,
    },
  ],
  Groq: [
    {
      id: "llama3-8b-8192",
      name: "Llama 3 8B",
      description: "Fast inference with good performance",
      context_length: 8192,
    },
    {
      id: "llama3-70b-8192",
      name: "Llama 3 70B",
      description: "Larger model with better capabilities",
      context_length: 8192,
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B",
      description: "Mixture of experts model",
      context_length: 32768,
    },
  ],
  Mistral: [
    {
      id: "open-mistral-7b",
      name: "Mistral 7B",
      description: "Efficient open-source model",
      context_length: 32768,
    },
    {
      id: "open-mixtral-8x7b",
      name: "Mixtral 8x7B",
      description: "Mixture of experts architecture",
      context_length: 32768,
    },
    {
      id: "mistral-large-latest",
      name: "Mistral Large",
      description: "Most capable Mistral model",
      context_length: 32768,
    },
  ],
};

const { height: screenHeight } = Dimensions.get("window");

interface ModelSelectorProps {
  onSelectModel: (model: string) => void;
  selectedModel: string | null;
  onRefresh?: () => void;
}

export default function ModelSelector({ onSelectModel, selectedModel, onRefresh }: ModelSelectorProps) {
  const [provider, setProvider] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<typeof providers>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [showProviderSelector, setShowProviderSelector] = useState(false);

  const loadAvailableProviders = useCallback(async () => {
    try {
      const providersWithKeys = [];

      for (const provider of providers) {
        const apiKey = await getItem(getApiKeyStoreKey(provider.name));
        if (apiKey && apiKey.trim()) {
          providersWithKeys.push(provider);
        }
      }

      setAvailableProviders(providersWithKeys);

      // Load current provider
      const storedProvider = await getItem(PROVIDER_KEY);
      if (storedProvider && providersWithKeys.some(p => p.name === storedProvider)) {
        setProvider(storedProvider);
      } else if (providersWithKeys.length > 0) {
        // Set first available provider as default
        const defaultProvider = providersWithKeys[0].name;
        setProvider(defaultProvider);
        await setItem(PROVIDER_KEY, defaultProvider);
      } else {
        setProvider(null);
      }
    } catch (error) {
      console.error("Failed to load available providers:", error);
    }
  }, []);

  useEffect(() => {
    loadAvailableProviders();
  }, [loadAvailableProviders]);

  const fetchExternalModels = useCallback(async (providerName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      const data = await response.json();

      const modelInfos: ModelInfo[] = data.data
        .filter((model: any) =>
          providerName === "DeepSeek"
            ? model.id.includes("deepseek")
            : true
        )
        .map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description,
          context_length: model.context_length,
          pricing: model.pricing,
        }));

      setModels(modelInfos);
    } catch (error) {
      console.error("Failed to fetch models from OpenRouter", error);
      // Fallback to empty array
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!provider) return;

    if (provider === "OpenRouter" || provider === "DeepSeek") {
      fetchExternalModels(provider);
    } else {
      setModels(hardcodedModels[provider] || []);
    }
  }, [provider, fetchExternalModels]);

  const openModal = useCallback(() => {
    setModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [slideAnim]);

  const closeModal = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: screenHeight,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setModalVisible(false);
    });
  }, [slideAnim]);

  const handleSelectModel = useCallback((model: ModelInfo) => {
    onSelectModel(model.id);
    closeModal();
  }, [onSelectModel, closeModal]);

  const handleProviderChange = useCallback(async (newProvider: string) => {
    try {
      setProvider(newProvider);
      await setItem(PROVIDER_KEY, newProvider);
      setShowProviderSelector(false);
    } catch (error) {
      console.error("Failed to save provider:", error);
    }
  }, []);

  const toggleProviderSelector = useCallback(() => {
    setShowProviderSelector(!showProviderSelector);
  }, [showProviderSelector]);

  const handleRefresh = useCallback(() => {
    loadAvailableProviders();
    onRefresh?.();
  }, [loadAvailableProviders, onRefresh]);

  // Expose refresh function for parent components
  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-refresh every 30 seconds to pick up new API keys
      loadAvailableProviders();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAvailableProviders]);

  const getSelectedModelInfo = useCallback(() => {
    if (!selectedModel) return null;
    return models.find(model => model.id === selectedModel);
  }, [selectedModel, models]);

  const formatContextLength = (length?: number) => {
    if (!length) return "";
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M tokens`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K tokens`;
    return `${length} tokens`;
  };

  const selectedModelInfo = getSelectedModelInfo();
  const currentProvider = providers.find(p => p.name === provider);

  if (availableProviders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noProviderContainer}>
          <IconSymbol
            name="exclamationmark.triangle"
            size={24}
            color={AC.systemOrange}
          />
          <Text style={styles.noProviderText}>No API keys configured</Text>
          <Text style={styles.noProviderSubtext}>
            Please configure at least one provider in Settings
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="arrow.clockwise"
              size={16}
              color={AC.systemBlue}
            />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Provider Selector */}
      {availableProviders.length > 1 && (
        <View style={styles.providerSection}>
          <TouchableOpacity
            style={styles.providerButton}
            onPress={toggleProviderSelector}
            activeOpacity={0.7}
          >
            <View style={styles.providerContent}>
              <View style={styles.providerInfo}>
                <View style={[styles.providerDot, { backgroundColor: currentProvider?.color }]} />
                <Text style={styles.providerName}>{provider}</Text>
              </View>
              <IconSymbol
                name={showProviderSelector ? "chevron.up" : "chevron.down"}
                size={14}
                color={AC.secondaryLabel}
              />
            </View>
          </TouchableOpacity>

          {showProviderSelector && (
            <View style={styles.providerDropdown}>
              {availableProviders.map((prov) => (
                <TouchableOpacity
                  key={prov.name}
                  style={[
                    styles.providerOption,
                    provider === prov.name && styles.selectedProviderOption
                  ]}
                  onPress={() => handleProviderChange(prov.name)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.providerDot, { backgroundColor: prov.color }]} />
                  <Text style={[
                    styles.providerOptionText,
                    provider === prov.name && styles.selectedProviderText
                  ]}>
                    {prov.name}
                  </Text>
                  {provider === prov.name && (
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={AC.systemBlue}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Model Selector */}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <View style={styles.modelInfo}>
            <Text style={styles.modelName}>
              {selectedModelInfo?.name || selectedModel || "Select a model"}
            </Text>
            {selectedModelInfo?.description && (
              <Text style={styles.modelDescription} numberOfLines={1}>
                {selectedModelInfo.description}
              </Text>
            )}
          </View>
          <IconSymbol
            name="chevron.down"
            size={16}
            color={AC.secondaryLabel}
          />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>Select Model</Text>
              {provider && (
                <View style={styles.modalProviderInfo}>
                  <View style={[styles.providerDot, { backgroundColor: currentProvider?.color }]} />
                  <Text style={styles.providerLabel}>{provider}</Text>
                  {availableProviders.length > 1 && (
                    <Text style={styles.providerCount}>
                      ({availableProviders.length} providers available)
                    </Text>
                  )}
                </View>
              )}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={AC.systemBlue} />
                <Text style={styles.loadingText}>Loading models...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modelsList}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                {models.map((model, index) => (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.modelItem,
                      selectedModel === model.id && styles.selectedModelItem,
                      index === models.length - 1 && styles.lastModelItem,
                    ]}
                    onPress={() => handleSelectModel(model)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.modelItemContent}>
                      <View style={styles.modelItemInfo}>
                        <Text style={[
                          styles.modelItemName,
                          selectedModel === model.id && styles.selectedModelText
                        ]}>
                          {model.name}
                        </Text>
                        {model.description && (
                          <Text style={styles.modelItemDescription} numberOfLines={2}>
                            {model.description}
                          </Text>
                        )}
                        {model.context_length && (
                          <Text style={styles.contextLength}>
                            {formatContextLength(model.context_length)}
                          </Text>
                        )}
                      </View>
                      {selectedModel === model.id && (
                        <IconSymbol
                          name="checkmark.circle.fill"
                          size={24}
                          color={AC.systemBlue}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                {models.length === 0 && !isLoading && (
                  <View style={styles.emptyState}>
                    <IconSymbol
                      name="exclamationmark.triangle"
                      size={48}
                      color={AC.systemGray}
                    />
                    <Text style={styles.emptyStateText}>No models available</Text>
                    <Text style={styles.emptyStateSubtext}>
                      Please check your provider settings
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  noProviderContainer: {
    backgroundColor: AC.secondarySystemGroupedBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AC.systemOrange,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  noProviderText: {
    fontSize: 16,
    fontWeight: "600",
    color: AC.label,
    marginTop: 8,
  },
  noProviderSubtext: {
    fontSize: 14,
    color: AC.secondaryLabel,
    marginTop: 4,
    textAlign: "center",
  },
  providerSection: {
    marginBottom: 8,
  },
  providerButton: {
    backgroundColor: AC.secondarySystemGroupedBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AC.separator,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  providerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: "500",
    color: AC.label,
  },
  providerDropdown: {
    backgroundColor: AC.secondarySystemGroupedBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AC.separator,
    marginTop: 4,
    overflow: "hidden",
  },
  providerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AC.separator,
  },
  selectedProviderOption: {
    backgroundColor: AC.systemBlue + "10",
  },
  providerOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: AC.label,
    flex: 1,
  },
  selectedProviderText: {
    color: AC.systemBlue,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AC.systemBlue + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: AC.systemBlue,
    marginLeft: 4,
  },
  selectorButton: {
    backgroundColor: AC.secondarySystemGroupedBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AC.separator,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modelInfo: {
    flex: 1,
    marginRight: 12,
  },
  modelName: {
    fontSize: 16,
    fontWeight: "600",
    color: AC.label,
  },
  modelDescription: {
    fontSize: 14,
    color: AC.secondaryLabel,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: AC.systemGroupedBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
    paddingBottom: 34, // Safe area bottom
  },
  modalHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AC.separator,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: AC.systemGray3,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: AC.label,
  },
  modalProviderInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  providerLabel: {
    fontSize: 14,
    color: AC.secondaryLabel,
    fontWeight: "500",
  },
  providerCount: {
    fontSize: 12,
    color: AC.tertiaryLabel,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: AC.secondaryLabel,
    marginTop: 12,
  },
  modelsList: {
    flex: 1,
  },
  modelItem: {
    backgroundColor: AC.secondarySystemGroupedBackground,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AC.separator,
  },
  selectedModelItem: {
    borderColor: AC.systemBlue,
    backgroundColor: AC.systemBlue + "10",
  },
  lastModelItem: {
    marginBottom: 16,
  },
  modelItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  modelItemInfo: {
    flex: 1,
  },
  modelItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: AC.label,
  },
  selectedModelText: {
    color: AC.systemBlue,
  },
  modelItemDescription: {
    fontSize: 14,
    color: AC.secondaryLabel,
    marginTop: 4,
    lineHeight: 18,
  },
  contextLength: {
    fontSize: 12,
    color: AC.tertiaryLabel,
    marginTop: 6,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: AC.secondaryLabel,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: AC.tertiaryLabel,
    marginTop: 8,
    textAlign: "center",
  },
});
