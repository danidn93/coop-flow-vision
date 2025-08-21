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
import { Send, MessageSquare, Bot, User, Clock, CheckCircle } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatThread {
  id: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  message_type: string;
  content: string;
  created_at: string;
  metadata?: any;
  profiles?: {
    first_name: string;
    surname_1: string;
  };
}

const ChatSoporte = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadThreads();
      setupRealtimeSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadThreads = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('client_id', user?.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
      if (data && data.length > 0 && !selectedThread) {
        setSelectedThread(data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los hilos de chat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_sender_id_fkey(first_name, surname_1)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data?.map(msg => ({
        ...msg,
        sender_profile: undefined
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=in.(${threads.map(t => t.id).join(',')})`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as ChatMessage]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const createNewThread = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          client_id: user.id,
          subject: 'Nueva consulta',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      setThreads(prev => [data, ...prev]);
      setSelectedThread(data);
      
      // Send welcome message
      await sendSystemMessage(data.id, '¡Hola! Soy el asistente virtual de la Cooperativa Mariscal Sucre. ¿En qué puedo ayudarte hoy?\n\nPuedes preguntar sobre:\n• Horarios de buses\n• Tarifas\n• Tiempos de viaje\n• Información general');
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear el hilo de chat",
        variant: "destructive",
      });
    }
  };

  const sendSystemMessage = async (threadId: string, content: string) => {
    await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        message_type: 'system',
        content
      });
  };

  const processMessage = async (content: string) => {
    const lowerContent = content.toLowerCase();
    
    // Simple FAQ bot logic
    if (lowerContent.includes('horario') || lowerContent.includes('proximo bus')) {
      return 'Los horarios de nuestros buses son:\n• Milagro - Guayaquil: Cada 30 minutos desde 5:00 AM hasta 10:00 PM\n• Milagro - Durán: Cada 45 minutos desde 6:00 AM hasta 9:00 PM\n\nLos horarios son aproximados y pueden variar por tráfico.';
    }
    
    if (lowerContent.includes('precio') || lowerContent.includes('tarifa')) {
      return 'Nuestras tarifas son:\n• Milagro - Guayaquil: $3.00\n• Milagro - Durán: $2.50\n• Milagro - Babahoyo: $3.50\n• Milagro - Machala: $4.50';
    }
    
    if (lowerContent.includes('tiempo') || lowerContent.includes('cuanto falta')) {
      return 'Tiempos estimados de viaje:\n• A Guayaquil: 1 hora 30 minutos\n• A Durán: 1 hora 10 minutos\n• A Babahoyo: 2 horas\n• A Machala: 2 horas 30 minutos\n\nLos tiempos pueden variar según el tráfico.';
    }
    
    return 'Gracias por tu consulta. Un operador te responderá pronto. Para consultas inmediatas, puedes llamar a nuestras oficinas: (04) 2970-123';
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;

    try {
      // Send user message
      const userMessage = {
        thread_id: selectedThread.id,
        sender_id: user.id,
        message_type: 'text',
        content: newMessage
      };

      await supabase.from('chat_messages').insert(userMessage);

      // Process and send bot response
      const botResponse = await processMessage(newMessage);
      
      setTimeout(async () => {
        await supabase.from('chat_messages').insert({
          thread_id: selectedThread.id,
          sender_id: '00000000-0000-0000-0000-000000000000',
          message_type: 'system',
          content: botResponse
        });
      }, 1000);

      // Update thread last message time
      await supabase
        .from('chat_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedThread.id);

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat de Soporte</h1>
          <p className="text-muted-foreground">
            Consultas y soporte al cliente con asistente automático
          </p>
        </div>
        <Button onClick={createNewThread}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Nueva Consulta
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Thread List */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mis Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {threads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedThread?.id === thread.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">
                        {thread.subject || 'Consulta general'}
                      </h4>
                      <Badge 
                        variant={thread.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {thread.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(thread.last_message_at), 'dd/MM HH:mm', { locale: es })}
                    </div>
                  </div>
                ))}
                {threads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tienes consultas activas.
                    <br />
                    Crea una nueva consulta para comenzar.
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
              {selectedThread ? (
                <>
                  <MessageSquare className="h-5 w-5" />
                  {selectedThread.subject || 'Consulta'}
                  <Badge variant="outline" className="ml-auto">
                    {selectedThread.status}
                  </Badge>
                </>
              ) : (
                'Selecciona una consulta'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedThread ? (
              <>
                <ScrollArea className="h-96 px-6">
                  <div className="space-y-4 py-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div className={`flex gap-3 max-w-[80%] ${
                          message.sender_id === user?.id ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          <div className="flex-shrink-0">
                            {message.sender_id === user?.id ? (
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <Bot className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className={`space-y-1 ${
                            message.sender_id === user?.id ? 'text-right' : 'text-left'
                          }`}>
                            <div className={`px-3 py-2 rounded-lg ${
                              message.sender_id === user?.id 
                                ? 'bg-primary text-primary-foreground ml-auto' 
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground px-3">
                              {format(new Date(message.created_at), 'HH:mm', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe tu consulta..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                Selecciona una consulta para ver los mensajes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatSoporte;