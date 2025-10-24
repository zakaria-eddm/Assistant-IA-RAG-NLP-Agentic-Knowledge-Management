import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, useWindowDimensions, ScrollView, Platform,
  TouchableOpacity, Clipboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const MessageRenderer = ({ content = '' }) => {
  const { width } = useWindowDimensions();
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = (code, index) => {
    Clipboard.setString(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const cleanContent = (text) => {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  };

  const parseParts = (text) => {
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      parts.push({ 
        type: 'code', 
        language: match[1] || 'text', 
        code: match[2].trim() 
      });
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const renderTextPart = (text, index) => {
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?(.*)/g, '$1')
      .replace(/\n{3,}/g, '\n\n');

    return (
      <Text key={`text-${index}`} style={styles.messageText}>
        {formattedText}
      </Text>
    );
  };

  const renderCodePart = (code, language, index) => {
    return (
      <View key={`code-${index}`} style={styles.codeContainer}>
        {/* En-tête du code avec langage et bouton copier */}
        <View style={styles.codeHeader}>
          <Text style={styles.codeLanguage}>
            {language.toUpperCase()}
          </Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(code, index)}
          >
            <Icon 
              name={copiedIndex === index ? 'check' : 'content-copy'} 
              size={16} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Contenu du code avec SyntaxHighlighter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.codeScrollContainer}
        >
          <SyntaxHighlighter
            language={language}
            style={atomOneDark}
            customStyle={styles.syntaxHighlighter}
            highlighter="hljs"
          >
            {code}
          </SyntaxHighlighter>
        </ScrollView>
      </View>
    );
  };

  try {
    const cleanedContent = cleanContent(content);
    const parts = parseParts(cleanedContent);

    return (
      <View style={styles.container}>
        {parts.map((part, index) => 
          part.type === 'text' 
            ? renderTextPart(part.content, index)
            : renderCodePart(part.code, part.language, index)
        )}
      </View>
    );
  } catch (error) {
    console.error('Error rendering message:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>
          {cleanContent(content)}
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 16,
    lineHeight: 24,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  codeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    maxWidth: '100%',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  codeLanguage: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  codeScrollContainer: {
    minWidth: '100%',
  },
  syntaxHighlighter: {
    padding: 12,
    margin: 0,
    backgroundColor: 'transparent',
    fontSize: 14,
    lineHeight: 20,
  },
});

// Styles personnalisés pour atomOneDark
const customAtomOneDark = {
  ...atomOneDark,
  'hljs': {
    ...atomOneDark['hljs'],
    background: '#1a1a1a',
    color: '#e2e8f0',
    padding: 12,
  },
  'hljs-comment': {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  'hljs-keyword': {
    color: '#ff79c6',
    fontWeight: 'bold',
  },
  'hljs-string': {
    color: '#50fa7b',
  },
  'hljs-number': {
    color: '#bd93f9',
  },
  'hljs-function': {
    color: '#8be9fd',
  },
  'hljs-params': {
    color: '#f8f8f2',
  },
};

export default MessageRenderer;