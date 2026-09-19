'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { socketService } from '@/lib/socket';
import { messagesAPI } from '@/lib/api';
import { Message } from '@/types';
import { Send, Loader2, Award } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ChatInterface() {
  const { user, accessToken } = useAuthStore();
  const { currentConversation, messages, addMessage, setMessages } = useChatStore();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationMessages = currentConversation
    ? messages[currentConversation.id] || []
    : [];

  useEffect(() => {
    if (currentConversation && accessToken && user) {
      loadMessages();
      connectSocket();
    }

    return () => {
      socketService.off('message:new');
      socketService.off('points:earned');
    };
  }, [currentConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const connectSocket = () => {
    if (!accessToken || !user) return;

    socketService.connect(accessToken, user.id);

    socketService.on('message:new', (data: Message) => {
      if (data.conversation_id === currentConversation?.id) {
        addMessage(data.conversation_id, data);
      }
    });

    socketService.on('points:earned', (data: any) => {
      toast.success(
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          <span>Earned {data.points_awarded} points!</span>
        </div>,
        { duration: 3000 }
      );
    });
  };

  const loadMessages = async () => {
    if (!currentConversation) return;

    setLoading(true);
    try {
      const response = await messagesAPI.getMessages(currentConversation.id);
      setMessages(currentConversation.id, response.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation || sending) return;

    const clientMessageId = `temp-${Date.now()}`;
    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      socketService.emit('message:send', {
        conversation_id: currentConversation.id,
        content,
        message_type: 'text',
        client_message_id: clientMessageId,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-xl font-semibold text-gray-900">
          {currentConversation.name || 'Chat'}
        </h2>
        <p className="text-sm text-gray-500">
          {currentConversation.participants?.length || 0} participants
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : conversationMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          conversationMessages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && message.sender && (
                    <p className="text-xs font-medium mb-1 text-gray-600">
                      {message.sender.display_name}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-primary-100' : 'text-gray-500'
                    }`}
                  >
                    {format(new Date(message.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !messageInput.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
