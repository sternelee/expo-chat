import * as Form from "@/components/ui/Form";
import { getItem, setItem } from "@/lib/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

const HTTP_URL_KEY = "mcp_http_url";
const SSE_URL_KEY = "mcp_sse_url";

const validateUrl = (url: string): boolean => {
  if (!url) return true; // Empty URLs are allowed
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function McpSettings() {
  const [httpUrl, setHttpUrl] = useState("");
  const [sseUrl, setSseUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({ http: "", sse: "" });

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storedHttpUrl, storedSseUrl] = await Promise.all([
        getItem(HTTP_URL_KEY),
        getItem(SSE_URL_KEY)
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
        setItem(HTTP_URL_KEY, httpUrl.trim()),
        setItem(SSE_URL_KEY, sseUrl.trim())
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
      <Form.List>
        <Form.Section title="Loading...">
          <Text>Loading MCP settings...</Text>
        </Form.Section>
      </Form.List>
    );
  }

  return (
    <Form.List>
      <Form.Section title="Model Context Protocol (MCP)">
        <Text style={styles.description}>
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
          style={[styles.input, errors.http && styles.inputError]}
        />
        {errors.http ? (
          <Text style={styles.errorText}>{errors.http}</Text>
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
          style={[styles.input, errors.sse && styles.inputError]}
        />
        {errors.sse ? (
          <Text style={styles.errorText}>{errors.sse}</Text>
        ) : (
          <Text style={styles.helperText}>
            SSE endpoint for real-time server communication
          </Text>
        )}
      </Form.Section>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <View style={styles.button}>
            <Button
              title={isSaving ? "Saving..." : "Save Settings"}
              onPress={handleSave}
              disabled={isSaving || hasErrors}
              color="#059669"
            />
          </View>
          {hasValidSettings && (
            <View style={styles.button}>
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
          <Text style={styles.statusText}>
            {httpUrl && sseUrl
              ? "Both HTTP and SSE endpoints configured"
              : httpUrl
                ? "HTTP endpoint configured"
                : "SSE endpoint configured"}
          </Text>
        </Form.Section>
      )}
    </Form.List>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 8,
  },
  input: {
    marginVertical: 4,
  },
  inputError: {
    borderColor: "#dc2626",
    borderWidth: 1,
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "500",
  },
});
