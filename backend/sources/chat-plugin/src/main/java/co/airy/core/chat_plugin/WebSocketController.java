package co.airy.core.chat_plugin;

import co.airy.avro.communication.Message;
import co.airy.core.chat_plugin.payload.MessageUpsertPayload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketController {
    public static final String QUEUE_MESSAGE = "/queue/message";
    private final SimpMessagingTemplate messagingTemplate;

    WebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void onNewMessage(Message message) {
        messagingTemplate.convertAndSendToUser(message.getConversationId(), QUEUE_MESSAGE, MessageUpsertPayload.fromMessage(message));
    }
}
