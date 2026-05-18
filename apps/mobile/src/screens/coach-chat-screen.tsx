import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ApiClientError } from "@elev9/api-client";
import {
  Button,
  Card,
  colors,
  Input,
  Screen,
  Text,
} from "@elev9/ui";
import type {
  CoachChatHistoryMessage,
  CoachChatHistoryResponse,
} from "@elev9/types";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/auth-provider";

type ChatMessage = CoachChatHistoryMessage & {
  localId: string;
};

const CHAT_HISTORY_LIMIT = 50;

export function CoachChatScreen() {
  const { signOut } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadHistory = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!options?.refresh) {
        setIsLoadingHistory(true);
      }

      setErrorMessage(null);

      try {
        const response = await apiClient.ai.getChatHistory({
          limit: CHAT_HISTORY_LIMIT,
        });

        setMessages(normalizeHistory(response));
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          error.code === "AUTH_INVALID_SESSION"
        ) {
          await signOut();
          return;
        }

        if (error instanceof ApiClientError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to load coach chat.");
        }
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [signOut],
  );

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const handleSendMessage = useCallback(async () => {
    const message = draftMessage.trim();

    if (message.length === 0 || isSending) {
      return;
    }

    setDraftMessage("");
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      localId: createLocalId("user"),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    try {
      const response = await apiClient.ai.sendChatMessage({ message });
      const assistantMessage: ChatMessage = {
        localId: createLocalId("assistant"),
        role: "assistant",
        content: response.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.code === "AUTH_INVALID_SESSION"
      ) {
        await signOut();
        return;
      }

      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to send your message.");
      }
    } finally {
      setIsSending(false);
    }
  }, [draftMessage, isSending, signOut]);

  const hasMessages = messages.length > 0;
  const canSend =
    draftMessage.trim().length > 0 && !isSending && !isLoadingHistory;

  return (
    <Screen contentStyle={styles.root}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Coach Chat</Text>
          <Text variant="headline" style={styles.title}>
            Talk with your coach
          </Text>
          <Text style={styles.subtitle}>
            Ask about recovery, training pace, or nutrition consistency. Replies
            are deterministic and based on your current health context.
          </Text>
        </View>

        <Card style={styles.messagesCard}>
          {isLoadingHistory ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : hasMessages ? (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.localId}
                  message={message}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="title" style={styles.emptyTitle}>
                Start the conversation
              </Text>
              <Text style={styles.emptyText}>
                Ask your coach about today&apos;s session, recovery, or nutrition
                priorities.
              </Text>
            </View>
          )}
        </Card>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Card style={styles.composerCard}>
          <Input
            label="Message"
            placeholder="Ask your coach something..."
            value={draftMessage}
            onChangeText={setDraftMessage}
            editable={!isSending && !isLoadingHistory}
            multiline
            numberOfLines={4}
            inputStyle={styles.composerInput}
            containerStyle={styles.composerInputContainer}
          />
          <Button
            label="Send"
            onPress={() => void handleSendMessage()}
            loading={isSending}
            disabled={!canSend}
            style={styles.sendButton}
          />
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant,
        ]}
      >
        <View style={styles.messageHeader}>
          <Text
            style={[
              styles.messageRole,
              isUser ? styles.messageRoleUser : styles.messageRoleAssistant,
            ]}
          >
            {isUser ? "You" : "Coach"}
          </Text>
          <Text
            style={[
              styles.messageTimestamp,
              isUser ? styles.messageMetaUser : styles.messageMetaAssistant,
            ]}
          >
            {formatTimestamp(message.createdAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.messageContent,
            isUser ? styles.messageContentUser : styles.messageContentAssistant,
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

function normalizeHistory(
  response: CoachChatHistoryResponse,
): ChatMessage[] {
  return response.map((message, index) => ({
    ...message,
    localId: `${message.createdAt}-${index}`,
  }));
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 16,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
  messagesCard: {
    flex: 1,
    gap: 0,
    padding: 0,
    overflow: "hidden",
  },
  messagesScroll: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: colors.mutedText,
  },
  messagesList: {
    gap: 12,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: colors.text,
  },
  emptyText: {
    color: colors.mutedText,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "88%",
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  messageBubbleAssistant: {
    backgroundColor: "#0b1220",
    borderColor: colors.border,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  messageRoleUser: {
    color: colors.primaryText,
  },
  messageRoleAssistant: {
    color: colors.mutedText,
  },
  messageTimestamp: {
    fontSize: 12,
  },
  messageMetaUser: {
    color: colors.primaryText,
  },
  messageMetaAssistant: {
    color: colors.mutedText,
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageContentUser: {
    color: colors.primaryText,
  },
  messageContentAssistant: {
    color: colors.text,
  },
  error: {
    color: "#fca5a5",
  },
  composerCard: {
    gap: 14,
  },
  composerInputContainer: {
    gap: 6,
  },
  composerInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  sendButton: {
    width: "100%",
  },
});
