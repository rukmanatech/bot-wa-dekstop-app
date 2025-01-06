import { Client } from 'whatsapp-web.js';

export interface WhatsAppMessage {
    from: string;
    body: string;
}

export interface SendMessageRequest {
    number: string;
    message: string;
}

export interface SendMessageResponse {
    success: boolean;
    error?: string;
}

export interface WhatsAppClient extends Client {
    sendMessage(chatId: string, message: string): Promise<any>;
} 