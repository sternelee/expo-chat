"use client";

import { useActions, useAIState, useUIState } from "ai/rsc";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Stack } from "expo-router";
import { AI } from "./ai-context";
import { ChatToolbarInner } from "./chat-toolbar";
import { KeyboardFriendlyScrollView } from "./keyboard-friendly-scrollview";
import { HeaderButton } from "./ui/Header";
import { IconSymbol } from "./ui/IconSymbol";

import * as AC from "@bacons/apple-colors";

import { nanoid } from "@/util/nanoid";
import { tw } from "@/util/tw";
import { AnimatedLogo } from "./animated-logo";
import { ChatContainer } from "./chat-container";
import ModelSelector from "./model-selector";
import { getItem } from "@/lib/async-storage";

const HEADER_HEIGHT = 0;

function MessagesScrollView() {
  const [messages] = useUIState<typeof AI>();

  const { top } = useSafeAreaInsets();

  const textInputHeight = 8 + 36;

  return (
    <>
      <KeyboardFriendlyScrollView
        style={[{ flex: 1 }, tw`md:w-[768px] max-w-[768px] md:mx-auto`]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: top + HEADER_HEIGHT + 24,
          paddingBottom: textInputHeight,
          gap: 16,
          flex: messages.length ? undefined : 1,
        }}
      >
        {
          // View messages in UI state
          messages.map((message) => (
            <View key={message.id}>{message.display}</View>
          ))
        }
      </KeyboardFriendlyScrollView>
      {messages.length === 0 && <AnimatedLogo />}
    </>
  );
}

export function ChatUI() {
  const [, setAIState] = useAIState<typeof AI>();
  const [messages, setMessages] = useUIState<typeof AI>();

  return (
    <ChatContainer>
      <Stack.Screen
        options={{
          headerRight: () => (
            <>
              {!!messages.length && (
                <HeaderButton
                  pressOpacity={0.7}
                  style={[
                    process.env.EXPO_OS === "web"
                      ? {
                          paddingHorizontal: 16,
                          alignItems: "center",
                          display: "flex",
                        }
                      : {
                          // Offset on the side so the margins line up. Unclear how to handle when this is used in headerLeft.
                          // We should automatically detect it somehow.
                          marginRight: -8,
                        },
                  ]}
                  onPress={() => {
                    setAIState({ chatId: nanoid(), messages: [] });
                    setMessages([]);
                  }}
                >
                  <IconSymbol name="square.and.pencil" color={AC.label} />
                </HeaderButton>
              )}
            </>
          ),
        }}
      />

      <MessagesScrollView />

      <ChatToolbar />
    </ChatContainer>
  );
}

function ChatToolbar() {
  const [messages, setMessages] = useUIState<typeof AI>();
  const { onSubmit } = useActions<typeof AI>();
  const [selectedModel, setSelectedModel] = React.useState<string | null>(null);
  const [providerData, setProviderData] = React.useState<{
    providerName: string | null;
    apiKey: string | null;
    httpUrl: string | null;
    sseUrl: string | null;
  }>({
    providerName: null,
    apiKey: null,
    httpUrl: null,
    sseUrl: null,
  });

  useEffect(() => {
    const loadProviderData = async () => {
      try {
        const providerName = await getItem("ai_provider");
        const apiKey = providerName ? await getItem(`${providerName.toLowerCase()}_api_key`) : null;
        const httpUrl = await getItem("mcp_http_url");
        const sseUrl = await getItem("mcp_sse_url");
        
        setProviderData({
          providerName,
          apiKey,
          httpUrl,
          sseUrl,
        });
      } catch (error) {
        console.error("Failed to load provider data:", error);
      }
    };

    loadProviderData();
  }, []);

  const handleSubmit = async (message: string) => {
    return onSubmit(
      message, 
      selectedModel ?? undefined,
      providerData.providerName ?? undefined,
      providerData.apiKey ?? undefined,
      providerData.httpUrl ?? undefined,
      providerData.sseUrl ?? undefined
    );
  };

  return (
    <ChatToolbarInner
      messages={messages}
      setMessages={setMessages}
      onSubmit={handleSubmit}
    >
      <ModelSelector
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
    </ChatToolbarInner>
  );
}
