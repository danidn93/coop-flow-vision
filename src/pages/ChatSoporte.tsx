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
        .select('id, sender_id, message_type, content, created_at, metadata')
        .eq('thread_id', threadId)
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
    
    // Enhanced AI-like responses with context awareness
    if (lowerContent.includes('horario') || lowerContent.includes('proximo bus') || lowerContent.includes('cuando sale')) {
      const currentHour = new Date().getHours();
      let timeContext = '';
      if (currentHour < 12) timeContext = 'Buenos días. ';
      else if (currentHour < 18) timeContext = 'Buenas tardes. ';
      else timeContext = 'Buenas noches. ';
      
      return `${timeContext}Aquí tienes los horarios de nuestras rutas:\n\n🚌 **Milagro - Guayaquil**\n• Cada 30 minutos\n• 5:00 AM - 10:00 PM\n\n🚌 **Milagro - Simón Bolívar**\n• Cada 20 minutos\n• 5:30 AM - 9:30 PM\n\n🚌 **Milagro - Lorenzo de Garaicoa**\n• Cada 30 minutos\n• 6:00 AM - 8:00 PM\n\n🚌 **Milagro - Mata de Plátano**\n• Cada 25 minutos\n• 5:45 AM - 9:00 PM\n\n⚠️ Los horarios pueden variar por condiciones de tráfico.`;
    }
    
    if (lowerContent.includes('precio') || lowerContent.includes('tarifa') || lowerContent.includes('cuesta') || lowerContent.includes('vale')) {
      return '💰 **Tarifas actuales de nuestras rutas:**\n\n• **Milagro ↔ Guayaquil**: $3.00\n• **Milagro ↔ Simón Bolívar**: $1.50\n• **Milagro ↔ Lorenzo de Garaicoa**: $2.00\n• **Milagro ↔ Mata de Plátano**: $1.25\n\n📝 *Tarifas sujetas a regulación municipal*\n💳 Aceptamos efectivo y tarjetas de débito';
    }
    
    if (lowerContent.includes('tiempo') || lowerContent.includes('cuanto') || lowerContent.includes('duracion') || lowerContent.includes('demora')) {
      return '⏱️ **Tiempos estimados de viaje:**\n\n🕐 **A Guayaquil**: 1h 30min\n🕐 **A Simón Bolívar**: 45 minutos\n🕐 **A Lorenzo de Garaicoa**: 55 minutos\n🕐 **A Mata de Plátano**: 35 minutos\n\n⚠️ *Los tiempos pueden variar según:*\n• Condiciones del tráfico\n• Hora del día\n• Condiciones climáticas\n• Paradas intermedias';
    }
    
    if (lowerContent.includes('simon bolivar') || lowerContent.includes('simón bolívar')) {
      return '🚌 **Ruta Milagro - Simón Bolívar**\n\n💰 **Tarifa**: $1.50\n⏱️ **Tiempo**: 45 minutos\n🕐 **Frecuencia**: Cada 20 minutos\n🌅 **Primer bus**: 5:30 AM\n🌙 **Último bus**: 9:30 PM\n\n📍 **Paradas principales:**\n• Terminal Milagro\n• Centro de Milagro\n• Puente Simón Bolívar\n• Terminal Simón Bolívar';
    }
    
    if (lowerContent.includes('lorenzo de garaicoa') || lowerContent.includes('garaicoa')) {
      return '🚌 **Ruta Milagro - Lorenzo de Garaicoa**\n\n💰 **Tarifa**: $2.00\n⏱️ **Tiempo**: 55 minutos\n🕐 **Frecuencia**: Cada 30 minutos\n🌅 **Primer bus**: 6:00 AM\n🌙 **Último bus**: 8:00 PM\n\n📍 **Información adicional:**\n• Servicio con aire acondicionado\n• Buses en excelente estado\n• Conductores certificados';
    }
    
    if (lowerContent.includes('mata de platano') || lowerContent.includes('mata de plátano')) {
      return '🚌 **Ruta Milagro - Mata de Plátano**\n\n💰 **Tarifa**: $1.25\n⏱️ **Tiempo**: 35 minutos\n🕐 **Frecuencia**: Cada 25 minutos\n🌅 **Primer bus**: 5:45 AM\n🌙 **Último bus**: 9:00 PM\n\n🌿 **Ruta escénica** que pasa por zonas agrícolas\n🚐 Buses cómodos y seguros';
    }
    
    if (lowerContent.includes('guayaquil')) {
      return '🚌 **Ruta Milagro - Guayaquil**\n\n💰 **Tarifa**: $3.00\n⏱️ **Tiempo**: 1h 30min\n🕐 **Frecuencia**: Cada 30 minutos\n🌅 **Primer bus**: 5:00 AM\n🌙 **Último bus**: 10:00 PM\n\n🏙️ **Nuestra ruta más popular**\n📍 Llegada: Terminal Terrestre de Guayaquil\n❄️ Buses con aire acondicionado\n📱 WiFi disponible en algunos buses';
    }
    
    if (lowerContent.includes('hola') || lowerContent.includes('buenos dias') || lowerContent.includes('buenas tardes') || lowerContent.includes('buenas noches')) {
      const currentHour = new Date().getHours();
      let greeting = '';
      if (currentHour < 12) greeting = '🌅 ¡Buenos días!';
      else if (currentHour < 18) greeting = '☀️ ¡Buenas tardes!';
      else greeting = '🌙 ¡Buenas noches!';
      
      return `${greeting} Bienvenido/a a la **Cooperativa Mariscal Sucre**.\n\n🤖 Soy su asistente virtual inteligente. Estoy aquí para ayudarle con:\n\n🚌 **Horarios y frecuencias**\n💰 **Tarifas actualizadas**\n⏱️ **Tiempos de viaje**\n📍 **Información de rutas**\n🎫 **Reservas y consultas**\n\n¿En qué puedo ayudarle hoy?`;
    }
    
    if (lowerContent.includes('gracias') || lowerContent.includes('thank')) {
      return '🙏 ¡De nada! Ha sido un placer ayudarle.\n\n😊 Si necesita más información sobre nuestros servicios, no dude en preguntar.\n\n🚌 ¡Que tenga un excelente viaje con la Cooperativa Mariscal Sucre!\n\n📞 Para emergencias: (04) 2970-123';
    }
    
    if (lowerContent.includes('problema') || lowerContent.includes('queja') || lowerContent.includes('reclamo')) {
      return '😔 Lamento escuchar que ha tenido un inconveniente.\n\n📝 **Para reportar problemas:**\n• Puede llamar a: (04) 2970-123\n• Visitar nuestras oficinas en horario de atención\n• Usar nuestro sistema de chat para detalles específicos\n\n🚨 **Para emergencias**: Comuníquese inmediatamente con nuestro despachador\n\n¡Su comodidad y seguridad son nuestra prioridad!';
    }
    
    if (lowerContent.includes('covid') || lowerContent.includes('bioseguridad') || lowerContent.includes('sanitario')) {
      return '🦠 **Protocolos de Bioseguridad COVID-19**\n\n✅ **Medidas implementadas:**\n• Desinfección diaria de buses\n• Ventilación constante\n• Uso obligatorio de mascarilla\n• Gel antibacterial disponible\n• Distanciamiento recomendado\n\n🏥 Priorizamos la salud de nuestros pasajeros y personal.\n\n⚠️ *Sujeto a regulaciones sanitarias vigentes*';
    }
    
    return '🤖 ¡Hola! Soy el **asistente virtual inteligente** de la Cooperativa Mariscal Sucre.\n\n💡 **Para brindarle la mejor respuesta, puede preguntarme sobre:**\n\n🚌 Horarios de buses\n💰 Tarifas y precios\n⏱️ Tiempos de viaje\n📍 Rutas disponibles\n🎫 Información de reservas\n🚨 Reportar problemas\n\n📞 **Contacto directo**: (04) 2970-123\n🏢 **Oficinas**: Lunes a Viernes 8:00 AM - 5:00 PM\n\n¿En qué más puedo ayudarle?';
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