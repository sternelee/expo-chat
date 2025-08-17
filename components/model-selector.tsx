import { useEffect, useState } from "react";
import { Button, View, Text, Modal, FlatList, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";

const PROVIDER_KEY = "ai_provider";

const hardcodedModels: Record<string, string[]> = {
  OpenAI: ["gpt-4o-mini-2024-07-18", "gpt-4o", "gpt-3.5-turbo"],
  Anthropic: [
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-3-opus-20240229",
  ],
  Google: ["models/gemini-pro", "models/gemini-1.5-pro-latest"],
  Groq: ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"],
  Mistral: ["open-mistral-7b", "open-mixtral-8x7b", "mistral-large-latest"],
};

export default function ModelSelector({ onSelectModel, selectedModel }: { onSelectModel: (model: string) => void, selectedModel: string | null }) {
  const [provider, setProvider] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const getProvider = async () => {
      const storedProvider = await SecureStore.getItemAsync(PROVIDER_KEY);
      setProvider(storedProvider);
    };
    getProvider();
  }, []);

  useEffect(() => {
    if (!provider) return;

    if (provider === "OpenRouter" || provider === "DeepSeek") {
      const fetchModels = async () => {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/models");
          const data = await response.json();
          const modelIds = data.data.map((model: any) => model.id);
          const filteredModels =
            provider === "DeepSeek"
              ? modelIds.filter((id: string) => id.includes("deepseek"))
              : modelIds;
          setModels(filteredModels);
        } catch (error) {
          console.error("Failed to fetch models from OpenRouter", error);
        }
      };
      fetchModels();
    } else {
      setModels(hardcodedModels[provider] || []);
    }
  }, [provider]);

  const handleSelectModel = (model: string) => {
    onSelectModel(model);
    setModalVisible(false);
  };

  return (
    <View>
      <Button title={selectedModel || "Select a model"} onPress={() => setModalVisible(true)} />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10, width: "80%" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Select a Model</Text>
            <FlatList
              data={models}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleSelectModel(item)} style={{ paddingVertical: 10 }}>
                  <Text>{item}</Text>
                </Pressable>
              )}
            />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
