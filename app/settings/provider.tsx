import * as Form from "@/components/ui/Form";
import { useEffect, useState } from "react";
import { Button, View } from "react-native";
import { getItem, setItem } from "@/lib/async-storage";

const providers = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Groq",
  "Mistral",
  "OpenRouter",
  "DeepSeek",
];
const PROVIDER_KEY = "ai_provider";

const getApiKeyStoreKey = (provider: string) => `${provider.toLowerCase()}_api_key`;

export default function ProviderSettings() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0]);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const loadProvider = async () => {
      const storedProvider = await getItem(PROVIDER_KEY);
      if (storedProvider) {
        setSelectedProvider(storedProvider);
      }
    };
    loadProvider();
  }, []);

  useEffect(() => {
    const loadApiKey = async () => {
      const key = getApiKeyStoreKey(selectedProvider);
      const storedApiKey = await getItem(key);
      setApiKey(storedApiKey || "");
    };
    loadApiKey();
  }, [selectedProvider]);

  const handleSave = async () => {
    await setItem(PROVIDER_KEY, selectedProvider);
    const key = getApiKeyStoreKey(selectedProvider);
    await setItem(key, apiKey);
    alert("Settings saved!");
  };

  return (
    <Form.List>
      <Form.Section title="Provider">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {providers.map((provider) => (
            <Button
              key={provider}
              title={provider}
              onPress={() => setSelectedProvider(provider)}
              color={selectedProvider === provider ? "blue" : "gray"}
            />
          ))}
        </View>
      </Form.Section>
      <Form.Section title={`API Key for ${selectedProvider}`}>
        <Form.Input
          placeholder={`Enter your ${selectedProvider} API key`}
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
        />
      </Form.Section>
      <Button title="Save" onPress={handleSave} />
    </Form.List>
  );
}
