import * as Form from "@/components/ui/Form";
import { getItem, setItem } from "@/lib/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const providers = [
  { name: "OpenAI", color: "#10a37f" },
  { name: "Anthropic", color: "#d97706" },
  { name: "Google", color: "#4285f4" },
  { name: "Groq", color: "#f97316" },
  { name: "Mistral", color: "#7c3aed" },
  { name: "OpenRouter", color: "#059669" },
  { name: "DeepSeek", color: "#dc2626" },
];

const PROVIDER_KEY = "ai_provider";
const getApiKeyStoreKey = (provider: string) => `${provider.toLowerCase()}_api_key`;

export default function ProviderSettings() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0].name);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedProvider = await getItem(PROVIDER_KEY);
      if (storedProvider) {
        setSelectedProvider(storedProvider);
      }
    } catch (error) {
      console.error("Failed to load provider settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadApiKey = useCallback(async (provider: string) => {
    try {
      const key = getApiKeyStoreKey(provider);
      const storedApiKey = await getItem(key);
      setApiKey(storedApiKey || "");
    } catch (error) {
      console.error("Failed to load API key:", error);
      setApiKey("");
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isLoading) {
      loadApiKey(selectedProvider);
    }
  }, [selectedProvider, isLoading, loadApiKey]);

  const handleProviderSelect = useCallback((provider: string) => {
    setSelectedProvider(provider);
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter an API key");
      return;
    }

    try {
      setIsSaving(true);
      await Promise.all([
        setItem(PROVIDER_KEY, selectedProvider),
        setItem(getApiKeyStoreKey(selectedProvider), apiKey.trim())
      ]);
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
      <Form.List>
        <Form.Section title="Loading...">
          <Text>Loading provider settings...</Text>
        </Form.Section>
      </Form.List>
    );
  }

  return (
    <Form.List>
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
              <Text
                style={[
                  styles.providerText,
                  { color: selectedProvider === provider.name ? "white" : "#374151" }
                ]}
              >
                {provider.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    </Form.List>
  );
}

const styles = StyleSheet.create({
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
});
