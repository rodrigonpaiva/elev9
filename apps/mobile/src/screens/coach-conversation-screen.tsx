import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@elev9/ui';

import type {
  CoachConversationMessage,
  CoachMessagePart,
} from '../hooks/use-coach-conversation';
import type { RootStackParamList } from '../navigation/app-navigator';
import {
  formatCoachMessageTime,
  trackCoachConversationEvent,
  useCoachConversation,
} from '../hooks/use-coach-conversation';
import { resolveAutoSendConversationPrompt } from '../hooks/coach/coach-conversation-helpers';

const conversationTokens = {
  background: '#ffffff',
  surface: '#f8fafc',
  card: '#ffffff',
  coachBubble: '#f1f5f9',
  userBubble: '#111827',
  text: '#111827',
  textOnDark: '#ffffff',
  secondaryText: '#667085',
  tertiaryText: '#98a2b3',
  border: '#e5e7eb',
  borderSoft: '#eef2f7',
  green: '#16a34a',
  blue: '#2563eb',
  amber: '#b45309',
  rose: '#e11d48',
} as const;

export function CoachConversationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CoachChat'>>();
  const conversation = useCoachConversation();
  const listRef = useRef<FlatList<CoachConversationMessage>>(null);
  const lastAutoPromptRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      trackCoachConversationEvent('coach_chat_opened');
      void conversation.loadHistory({ refresh: true });
    }, [conversation.loadHistory]),
  );

  useEffect(() => {
    if (conversation.messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      if (conversation.scrollOffset > 0) {
        listRef.current?.scrollToOffset({
          offset: conversation.scrollOffset,
          animated: false,
        });
        return;
      }

      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [conversation.messages.length, conversation.scrollOffset]);

  useEffect(() => {
    if (!conversation.isSending) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [conversation.isSending, conversation.messages.length]);

  useEffect(() => {
    const autoPrompt = resolveAutoSendConversationPrompt({
      initialPrompt: route.params?.initialPrompt,
      promptId: route.params?.promptId,
      lastAutoPromptId: lastAutoPromptRef.current,
    });

    if (!autoPrompt) {
      return;
    }

    lastAutoPromptRef.current = autoPrompt.promptId;
    void conversation.sendMessage(autoPrompt.prompt);
  }, [
    conversation.sendMessage,
    route.params?.initialPrompt,
    route.params?.promptId,
  ]);

  const handleSend = useCallback(
    (message?: string) => {
      void conversation.sendMessage(message);
    },
    [conversation.sendMessage],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      trackCoachConversationEvent('coach_suggestion_selected', {
        suggestion,
      });
      handleSend(suggestion);
    },
    [handleSend],
  );

  const renderMessage = useCallback(
    ({ item }: { item: CoachConversationMessage }) => (
      <MessageBubble message={item} />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: CoachConversationMessage) => item.localId,
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.keyboardRoot}
      >
        <ConversationHeader
          onInfo={() => navigation.navigate('CoachInsights')}
          onQuickQuestions={() => navigation.navigate('AskCoach')}
          status={conversation.context.status}
        />

        {!conversation.isContextBannerDismissed ? (
          <ContextBanner
            onDismiss={() => conversation.setContextBannerDismissed(true)}
            signals={conversation.context.signals}
          />
        ) : null}

        <FlatList
          ref={listRef}
          data={conversation.messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          style={styles.timeline}
          contentContainerStyle={[
            styles.timelineContent,
            conversation.messages.length === 0 ? styles.timelineEmpty : null,
          ]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            conversation.isLoadingHistory ? (
              <ConversationSkeleton />
            ) : (
              <ConversationEmptyState />
            )
          }
          ListFooterComponent={
            conversation.isSending ? (
              <TypingIndicator />
            ) : (
              <View style={styles.footerSpace} />
            )
          }
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={80}
          windowSize={9}
          onScroll={(event) => {
            conversation.setScrollOffset(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={120}
        />

        <View style={styles.bottomPanel}>
          {conversation.errorMessage ? (
            <InlineError
              isOffline={conversation.isOffline}
              message={conversation.errorMessage}
              onRetry={() => void conversation.retryLastMessage()}
            />
          ) : null}
          <SuggestedQuestions
            disabled={conversation.isSending || conversation.isLoadingHistory}
            onSelect={handleSuggestion}
            questions={conversation.context.suggestedQuestions}
          />
          <Composer
            disabled={conversation.isSending || conversation.isLoadingHistory}
            draft={conversation.draftMessage}
            isSending={conversation.isSending}
            onChangeDraft={conversation.setDraftMessage}
            onSend={() => handleSend()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ConversationHeader = memo(function ConversationHeader({
  onInfo,
  onQuickQuestions,
  status,
}: {
  status: string;
  onInfo: () => void;
  onQuickQuestions: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={20} color={conversationTokens.text} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.coachName}>Elev9 Coach</Text>
        <Text style={styles.coachStatus}>{status}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="Quick Questions"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onQuickQuestions}
          style={({ pressed }) => [
            styles.infoButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color={conversationTokens.text}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Explain Recommendation"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onInfo}
          style={({ pressed }) => [
            styles.infoButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name="help-circle-outline"
            size={23}
            color={conversationTokens.text}
          />
        </Pressable>
      </View>
    </View>
  );
});

const ContextBanner = memo(function ContextBanner({
  onDismiss,
  signals,
}: {
  signals: string[];
  onDismiss: () => void;
}) {
  return (
    <View
      accessibilityLabel={`Today's guidance is based on ${signals.join(', ')}.`}
      style={styles.contextBanner}
    >
      <View style={styles.contextCopy}>
        <Text style={styles.contextTitle}>Today's guidance is based on:</Text>
        <View style={styles.signalRow}>
          {signals.map((signal) => (
            <View key={signal} style={styles.signalChip}>
              <Text style={styles.signalText}>{signal}</Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable
        accessibilityLabel="Dismiss context banner"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.dismissButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicons
          name="close"
          size={18}
          color={conversationTokens.secondaryText}
        />
      </Pressable>
    </View>
  );
});

const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: CoachConversationMessage;
}) {
  const isUser = message.kind === 'user';

  return (
    <View
      accessibilityLabel={`${isUser ? 'User' : 'Coach'} message ${
        isUser ? 'sent' : 'received'
      }. ${message.content}`}
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowCoach,
      ]}
    >
      {!isUser ? <View style={styles.smallCoachAvatar} /> : null}
      <View style={styles.messageStack}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.coachBubble,
            getKindBubbleStyle(message.kind),
          ]}
        >
          <MessageParts isUser={isUser} parts={message.displayParts} />
        </View>
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.timestampUser : styles.timestampCoach,
          ]}
        >
          {formatCoachMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
});

const MessageParts = memo(function MessageParts({
  isUser,
  parts,
}: {
  parts: CoachMessagePart[];
  isUser: boolean;
}) {
  return (
    <View style={styles.messageParts}>
      {parts.map((part) => {
        if (part.type === 'divider') {
          return <View key={part.id} style={styles.messageDivider} />;
        }

        if (part.type === 'bullet') {
          return (
            <View key={part.id} style={styles.bulletRow}>
              <Text
                style={[
                  styles.bulletDot,
                  isUser ? styles.userText : styles.coachText,
                ]}
              >
                •
              </Text>
              <Text
                maxFontSizeMultiplier={1.35}
                style={[
                  styles.messageText,
                  isUser ? styles.userText : styles.coachText,
                ]}
              >
                {part.text}
              </Text>
            </View>
          );
        }

        return (
          <Text
            key={part.id}
            maxFontSizeMultiplier={1.35}
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.coachText,
            ]}
          >
            {part.text}
          </Text>
        );
      })}
    </View>
  );
});

const SuggestedQuestions = memo(function SuggestedQuestions({
  disabled,
  onSelect,
  questions,
}: {
  questions: string[];
  disabled: boolean;
  onSelect: (question: string) => void;
}) {
  return (
    <View style={styles.suggestions}>
      {questions.slice(0, 4).map((question) => (
        <Pressable
          accessibilityLabel={`Suggested question. ${question}`}
          accessibilityRole="button"
          disabled={disabled}
          key={question}
          onPress={() => onSelect(question)}
          style={({ pressed }) => [
            styles.suggestionChip,
            disabled ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.suggestionText}>{question}</Text>
        </Pressable>
      ))}
    </View>
  );
});

const Composer = memo(function Composer({
  disabled,
  draft,
  isSending,
  onChangeDraft,
  onSend,
}: {
  draft: string;
  disabled: boolean;
  isSending: boolean;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
}) {
  const canSend = draft.trim().length > 0 && !disabled;

  return (
    <View style={styles.composer}>
      <TextInput
        accessibilityLabel="Ask your coach anything"
        editable={!isSending}
        multiline
        onChangeText={onChangeDraft}
        placeholder="Ask your coach anything..."
        placeholderTextColor={conversationTokens.tertiaryText}
        style={styles.input}
        value={draft}
      />
      <Pressable
        accessibilityLabel="Send message"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => [
          styles.sendButton,
          !canSend ? styles.sendButtonDisabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicons name="arrow-up" size={21} color="#ffffff" />
      </Pressable>
    </View>
  );
});

function InlineError({
  isOffline,
  message,
  onRetry,
}: {
  message: string;
  isOffline: boolean;
  onRetry: () => void;
}) {
  return (
    <View
      accessibilityLabel={message}
      style={[styles.inlineError, isOffline ? styles.offlineNotice : null]}
    >
      <Text style={styles.inlineErrorText}>{message}</Text>
      <Pressable
        accessibilityLabel="Retry coach message"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function ConversationEmptyState() {
  return (
    <View
      accessibilityLabel="Welcome to your AI Coach."
      style={styles.emptyState}
    >
      <Text style={styles.emptyTitle}>Welcome to your AI Coach.</Text>
      <Text style={styles.emptyText}>
        Ask anything about training, nutrition or recovery.
      </Text>
    </View>
  );
}

function ConversationSkeleton() {
  return (
    <View
      accessibilityLabel="Loading coach conversation"
      accessibilityRole="progressbar"
      style={styles.skeleton}
    >
      <View style={[styles.skeletonBubble, styles.skeletonCoachBubble]} />
      <View style={[styles.skeletonBubble, styles.skeletonUserBubble]} />
      <View style={[styles.skeletonBubble, styles.skeletonCoachBubbleWide]} />
      <View style={styles.skeletonSuggestionRow}>
        <View style={styles.skeletonSuggestion} />
        <View style={styles.skeletonSuggestion} />
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <View style={styles.smallCoachAvatar} />
      <View accessibilityLabel="Coach is thinking" style={styles.typingBubble}>
        <Text style={styles.typingText}>Coach is thinking</Text>
        <View style={styles.typingDots}>
          <TypingDot delay={0} />
          <TypingDot delay={120} />
          <TypingDot delay={240} />
        </View>
      </View>
    </View>
  );
}

function TypingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [delay, opacity]);

  return <Animated.View style={[styles.typingDot, { opacity }]} />;
}

function getKindBubbleStyle(kind: CoachConversationMessage['kind']) {
  switch (kind) {
    case 'warning':
      return styles.warningBubble;
    case 'celebration':
      return styles.celebrationBubble;
    case 'recommendation':
      return styles.recommendationBubble;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: conversationTokens.background,
  },
  keyboardRoot: {
    flex: 1,
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: conversationTokens.border,
    backgroundColor: conversationTokens.background,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: conversationTokens.surface,
    borderWidth: 1,
    borderColor: conversationTokens.border,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  coachName: {
    color: conversationTokens.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  coachStatus: {
    color: conversationTokens.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  infoButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  contextBanner: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: conversationTokens.border,
    backgroundColor: conversationTokens.surface,
    padding: 14,
  },
  contextCopy: {
    flex: 1,
    gap: 10,
  },
  contextTitle: {
    color: conversationTokens.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: conversationTokens.border,
    backgroundColor: conversationTokens.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalText: {
    color: conversationTokens.secondaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  dismissButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
  },
  timelineEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  messageRowCoach: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  smallCoachAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 7,
    backgroundColor: conversationTokens.text,
  },
  messageStack: {
    maxWidth: '82%',
    gap: 5,
  },
  messageBubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  coachBubble: {
    borderBottomLeftRadius: 7,
    backgroundColor: conversationTokens.coachBubble,
  },
  userBubble: {
    borderBottomRightRadius: 7,
    backgroundColor: conversationTokens.userBubble,
  },
  recommendationBubble: {
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  warningBubble: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  celebrationBubble: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  messageParts: {
    gap: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  coachText: {
    color: conversationTokens.text,
  },
  userText: {
    color: conversationTokens.textOnDark,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
  },
  messageDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: conversationTokens.border,
  },
  timestamp: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  timestampCoach: {
    color: conversationTokens.tertiaryText,
    paddingLeft: 4,
  },
  timestampUser: {
    color: conversationTokens.tertiaryText,
    textAlign: 'right',
    paddingRight: 4,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 7,
    backgroundColor: conversationTokens.coachBubble,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  typingText: {
    color: conversationTokens.secondaryText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: conversationTokens.secondaryText,
  },
  footerSpace: {
    height: 8,
  },
  bottomPanel: {
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: conversationTokens.border,
    backgroundColor: conversationTokens.background,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    maxWidth: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: conversationTokens.border,
    backgroundColor: conversationTokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestionText: {
    color: conversationTokens.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  composer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: conversationTokens.border,
    backgroundColor: conversationTokens.surface,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    maxHeight: 124,
    minHeight: 40,
    paddingTop: 10,
    paddingBottom: 9,
    color: conversationTokens.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: conversationTokens.text,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  offlineNotice: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  inlineErrorText: {
    flex: 1,
    color: conversationTokens.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  retryButton: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: conversationTokens.text,
    paddingHorizontal: 12,
  },
  retryText: {
    color: conversationTokens.textOnDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: conversationTokens.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: conversationTokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  skeleton: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 10,
  },
  skeletonBubble: {
    height: 82,
    borderRadius: 22,
    backgroundColor: conversationTokens.surface,
  },
  skeletonCoachBubble: {
    width: '76%',
    alignSelf: 'flex-start',
  },
  skeletonUserBubble: {
    width: '58%',
    alignSelf: 'flex-end',
  },
  skeletonCoachBubbleWide: {
    width: '88%',
    alignSelf: 'flex-start',
  },
  skeletonSuggestionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonSuggestion: {
    width: 142,
    height: 34,
    borderRadius: 999,
    backgroundColor: conversationTokens.surface,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
