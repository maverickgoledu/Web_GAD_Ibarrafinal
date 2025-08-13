import React, { useState } from 'react';
import { MessageSquare, Send, User, Clock, Search, Filter } from 'lucide-react';
import '../styles/mensajeria.css'

const Mensajeria: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const conversations = [
    {
      id: 1,
      name: 'María González',
      lastMessage: 'Gracias por la información sobre la licencia',
      time: '10:30 AM',
      unread: 2,
      avatar: 'M'
    },
    {
      id: 2,
      name: 'Carlos Rodríguez',
      lastMessage: '¿Cuándo estará lista la documentación?',
      time: '09:15 AM',
      unread: 0,
      avatar: 'C'
    },
    {
      id: 3,
      name: 'Ana Pérez',
      lastMessage: 'Necesito información sobre el registro sanitario',
      time: 'Ayer',
      unread: 1,
      avatar: 'A'
    }
  ];

  const messages = [
    {
      id: 1,
      sender: 'María González',
      content: 'Hola, necesito información sobre la licencia de funcionamiento',
      time: '10:00 AM',
      isOwn: false
    },
    {
      id: 2,
      sender: 'Yo',
      content: 'Hola María, con gusto te ayudo. ¿Para qué tipo de negocio necesitas la licencia?',
      time: '10:05 AM',
      isOwn: true
    },
    {
      id: 3,
      sender: 'María González',
      content: 'Es para un restaurant en el centro de la ciudad',
      time: '10:10 AM',
      isOwn: false
    },
    {
      id: 4,
      sender: 'Yo',
      content: 'Perfecto, te envío la lista de requisitos que necesitas presentar.',
      time: '10:15 AM',
      isOwn: true
    },
    {
      id: 5,
      sender: 'María González',
      content: 'Gracias por la información sobre la licencia',
      time: '10:30 AM',
      isOwn: false
    }
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Aquí iría la lógica para enviar el mensaje
      setNewMessage('');
    }
  };

  const selectedConversationData = conversations.find(c => c.id === selectedConversation);


  return (
    <div className="mensajeria-container">
      <div className="mensajeria-header">
        <h1 className="mensajeria-title">
          <MessageSquare className="w-8 h-8 text-red-600 mr-3" />
          Mensajería
        </h1>
        <p className="mensajeria-subtitle">
          Comunicación directa con ciudadanos y empresarios
        </p>
      </div>

      <div className="mensajeria-chat-container">
        <div className="mensajeria-chat-layout">
          {/* Lista de conversaciones */}
          <div className="mensajeria-conversation-list">
            <div className="mensajeria-search-container">
              <div className="mensajeria-search-input-container">
                <Search className="mensajeria-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar conversaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mensajeria-search-input"
                />
              </div>
            </div>

            <div className="mensajeria-conversations-container">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`mensajeria-conversation-item ${selectedConversation === conversation.id ? 'mensajeria-selected-conversation' : ''
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="mensajeria-avatar">
                      {conversation.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 truncate">{conversation.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{conversation.time}</span>
                          {conversation.unread > 0 && (
                            <span className="mensajeria-unread-badge">
                              {conversation.unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="mensajeria-message-area">
            {selectedConversation ? (
              <>
                {/* Header de conversación */}
                <div className="mensajeria-conversation-header">
                  <div className="flex items-center space-x-3">
                    <div className="mensajeria-avatar">
                      {selectedConversationData?.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedConversationData?.name}</h3>
                      <p className="text-sm text-gray-500">En línea</p>
                    </div>
                  </div>
                </div>

                {/* Mensajes */}
                <div className="mensajeria-messages-container">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwn ? 'mensajeria-own-message' : 'mensajeria-other-message'}`}
                    >
                      <div className="mensajeria-message-bubble">
                        <div
                          className={`mensajeria-message-content ${message.isOwn
                              ? 'mensajeria-own-message-content'
                              : 'mensajeria-other-message-content'
                            }`}
                        >
                          <p>{message.content}</p>
                        </div>
                        <div className="mensajeria-message-time">
                          <Clock className="mensajeria-time-icon" />
                          <span className="mensajeria-time-text">{message.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input de mensaje */}
                <div className="mensajeria-message-input-container">
                  <div className="mensajeria-message-input-wrapper">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="mensajeria-message-input"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="mensajeria-send-button"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mensajeria-empty-state">
                <div className="mensajeria-empty-state-content">
                  <MessageSquare className="mensajeria-empty-state-icon" />
                  <p className="mensajeria-empty-state-text">Selecciona una conversación para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mensajeria;