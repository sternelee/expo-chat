import * as Form from "@/components/ui/Form";
import { useEffect, useState } from "react";
import { Button } from "react-native";
import { getItem, setItem } from "@/lib/async-storage";

const HTTP_URL_KEY = "mcp_http_url";
const SSE_URL_KEY = "mcp_sse_url";

export default function McpSettings() {
  const [httpUrl, setHttpUrl] = useState("");
  const [sseUrl, setSseUrl] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const storedHttpUrl = await getItem(HTTP_URL_KEY);
      if (storedHttpUrl) {
        setHttpUrl(storedHttpUrl);
      }
      const storedSseUrl = await getItem(SSE_URL_KEY);
      if (storedSseUrl) {
        setSseUrl(storedSseUrl);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    await setItem(HTTP_URL_KEY, httpUrl);
    await setItem(SSE_URL_KEY, sseUrl);
    alert("MCP settings saved!");
  };

  return (
    <Form.List>
      <Form.Section title="HTTP Server">
        <Form.Input
          placeholder="Enter HTTP MCP server URL"
          value={httpUrl}
          onChangeText={setHttpUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Form.Section>
      <Form.Section title="SSE Server">
        <Form.Input
          placeholder="Enter SSE MCP server URL"
          value={sseUrl}
          onChangeText={setSseUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Form.Section>
      <Button title="Save" onPress={handleSave} />
    </Form.List>
  );
}
