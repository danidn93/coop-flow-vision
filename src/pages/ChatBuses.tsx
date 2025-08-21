import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Send, MessageCircle, Bus, User, Clock, CheckCircle, 
  AlertTriangle, MapPin, Power, Paperclip, Image
} from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BusChat {
  id: string;
  bus_id: string;
  owner_id: string;
  driver_id: string;
  status: string;
  last_activity_at: string;
  driver_profile?: {
    first_name: string;
    surname_1: string;
  };
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message_type: string;
  content: string;
  created_at: string;
  read_at: string | null;
  metadata?: any;
  sender_profile?: {
    first_name: string;
    surname_1: string;
  };
}

interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'offline';
  last_seen_at: string;
}

const ChatBuses = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [busChats, setBusChats] = useState<BusChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<BusChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState<{ [key: string]: UserPresence }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnerOrAdmin = userRole?.role === 'partner' || userRole?.role === 'administrator';
  const isDriver = userRole?.role === 'driver';

  useEffect(() => {
    if (user && (isOwnerOrAdmin || isDriver)) {
      loadBusChats();
      setupRealtimeSubscription();
      setupPresenceUpdates();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      markMessagesAsRead(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadBusChats = async () => {
    try {
      let query = supabase
        .from('bus_chats')
        .select(`
          *,
          driver_profile:profiles!bus_chats_driver_id_fkey(first_name, surname_1)
        `);

      if (isOwnerOrAdmin) {
        query = query.eq('owner_id', user?.id);
      } else if (isDriver) {
        query = query.eq('driver_id', user?.id);
      }

      const { data, error } = await query.order('last_activity_at', { ascending: false });

      if (error) throw error;
      setBusChats(data?.map(chat => ({
        ...chat,
        driver_profile: undefined
      })) || []);
      if (data && data.length > 0 && !selectedChat) {
        setSelectedChat(data[0] as any);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los chats de buses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey(first_name, surname_1)
        `)
        .eq('bus_chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive",
      });
    }
  };

  const markMessagesAsRead = async (chatId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('bus_chat_id', chatId)
        .neq('sender_id', user?.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('bus-chat-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && selectedChat?.id === payload.new.bus_chat_id) {
            setMessages(prev => [...prev, payload.new as ChatMessage]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const setupPresenceUpdates = () => {
    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setPresence(prev => ({
              ...prev,
              [payload.new.user_id]: payload.new as UserPresence
            }));
          }
        }
      )
      .subscribe();

    // Update own presence
    if (selectedChat) {
      supabase
        .from('user_presence')
        .upsert({
          user_id: user?.id,
          status: 'online',
          bus_chat_id: selectedChat.id,
          last_seen_at: new Date().toISOString()
        })
        .then();
    }

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async (type: 'text' | 'quick_action' = 'text', quickAction?: string) => {
    if ((!newMessage.trim() && type === 'text') || !selectedChat || !user) return;

    try {
      const messageContent = type === 'quick_action' ? quickAction! : newMessage;
      const messageData = {
        bus_chat_id: selectedChat.id,
        sender_id: user.id,
        message_type: type,
        content: messageContent,
        metadata: type === 'quick_action' ? { action_type: quickAction } : {}
      };

      await supabase.from('chat_messages').insert(messageData);

      // Update chat activity
      await supabase
        .from('bus_chats')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', selectedChat.id);

      if (type === 'text') {
        setNewMessage('');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      'report_delay': '🚨 Reportando retraso en la ruta',
      'retire_bus': '🔧 Retirando bus del servicio por mantenimiento',
      'location_ping': '📍 Enviando ubicación actual'
    };
    
    sendMessage('quick_action', actionMessages[action as keyof typeof actionMessages]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${selectedChat.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      // Send message with file reference
      await supabase.from('chat_messages').insert({
        bus_chat_id: selectedChat.id,
        sender_id: user.id,
        message_type: file.type.startsWith('image/') ? 'image' : 'file',
        content: file.name,
        metadata: { 
          file_path: data.path,
          file_size: file.size,
          mime_type: file.type
        }
      });

      toast({
        title: "Éxito",
        description: "Archivo enviado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPresenceStatus = (userId: string) => {
    const userPresence = presence[userId];
    if (!userPresence) return 'offline';
    return userPresence.status;
  };

  const renderMessage = (message: ChatMessage) => {
    const isFromCurrentUser = message.sender_id === user?.id;
    const senderName = message.sender_profile 
      ? `${message.sender_profile.first_name} ${message.sender_profile.surname_1}`
      : isFromCurrentUser ? 'Tú' : 'Usuario';

    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex gap-3 max-w-[80%] ${
          isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'
        }`}>
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isFromCurrentUser ? 'bg-primary' : 'bg-muted'
            }`}>
              <User className={`h-4 w-4 ${isFromCurrentUser ? 'text-white' : ''}`} />
            </div>
          </div>
          <div className={`space-y-1 ${isFromCurrentUser ? 'text-right' : 'text-left'}`}>
            <div className={`px-3 py-2 rounded-lg ${
              isFromCurrentUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              {message.message_type === 'quick_action' ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{message.content}</span>
                </div>
              ) : message.message_type === 'image' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <span>{message.content}</span>
                  </div>
                  {/* Image preview could be added here */}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
            <div className="flex items-center gap-2 px-3">
              <p className="text-xs text-muted-foreground">
                {format(new Date(message.created_at), 'HH:mm', { locale: es })}
              </p>
              {isFromCurrentUser && (
                <CheckCircle className={`h-3 w-3 ${
                  message.read_at ? 'text-primary' : 'text-muted-foreground'
                }`} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isOwnerOrAdmin && !isDriver) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Acceso Restringido</h3>
          <p className="text-muted-foreground">
            Solo propietarios de buses y conductores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat de Buses</h1>
        <p className="text-muted-foreground">
          Comunicación directa entre propietarios y conductores
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Bus Chat List */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Mis Buses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {busChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedChat?.id === chat.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Bus {chat.bus_id}</h4>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          getPresenceStatus(isOwnerOrAdmin ? chat.driver_id : chat.owner_id) === 'online' 
                            ? 'bg-green-500' 
                            : 'bg-gray-400'
                        }`} />
                        <Badge 
                          variant={chat.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {chat.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isOwnerOrAdmin ? (
                        <>Conductor: {chat.driver_profile?.first_name} {chat.driver_profile?.surname_1}</>
                      ) : (
                        'Propietario'
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(chat.last_activity_at), 'dd/MM HH:mm', { locale: es })}
                    </div>
                  </div>
                ))}
                {busChats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {isOwnerOrAdmin 
                      ? 'No tienes buses asignados con conductores.'
                      : 'No tienes buses asignados como conductor.'
                    }
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedChat ? (
                <>
                  <Bus className="h-5 w-5" />
                  Bus {selectedChat.bus_id}
                  <div className="flex items-center gap-2 ml-auto">
                    <div className={`w-2 h-2 rounded-full ${
                      getPresenceStatus(isOwnerOrAdmin ? selectedChat.driver_id : selectedChat.owner_id) === 'online' 
                        ? 'bg-green-500' 
                        : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-normal">
                      {getPresenceStatus(isOwnerOrAdmin ? selectedChat.driver_id : selectedChat.owner_id) === 'online' 
                        ? 'En línea' 
                        : 'Desconectado'
                      }
                    </span>
                  </div>
                </>
              ) : (
                'Selecciona un chat'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedChat ? (
              <>
                <ScrollArea className="h-80 px-6">
                  <div className="space-y-4 py-4">
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* Quick Actions */}
                <div className="px-6 py-2 border-t border-b bg-muted/20">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleQuickAction('report_delay')}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Retraso
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleQuickAction('retire_bus')}
                    >
                      <Power className="h-3 w-3 mr-1" />
                      Retirar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleQuickAction('location_ping')}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Ubicación
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button onClick={() => sendMessage()} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                Selecciona un bus para ver el chat
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBuses;