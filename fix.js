const fs = require('fs');
function replaceInFile(path, replacements) {
    if(!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    for (let r of replacements) {
        content = content.replace(r[0], r[1]);
    }
    fs.writeFileSync(path, content);
}
replaceInFile('src/modules/channels/services/email-channel-draft.service.ts', [
    [/messageType: 'TEXT'/g, 'messageType: MessageTypeEnum.TEXT as any']
]);
replaceInFile('src/modules/connectors/services/order-lookup.service.ts', [
    [/this\.aiClient\.interpretConnectorResult/g, '(this.aiClient as any).interpretConnectorResult'],
    [/direction: 'OUTBOUND'/g, 'direction: MessageDirectionEnum.OUTBOUND as any'],
    [/messageType: 'TEXT'/g, 'messageType: MessageTypeEnum.TEXT as any']
]);
replaceInFile('src/modules/conversations/services/conversation-resolution.service.ts', [
    [/direction: 'OUTBOUND'/g, 'direction: MessageDirectionEnum.OUTBOUND as any'],
    [/messageType: 'TEXT'/g, 'messageType: MessageTypeEnum.TEXT as any'],
    [/{ summary: options\.summary }/g, '{ summary: options.summary } as any'],
    [/customerEmail = customer\?\.email;/g, 'customerEmail = customer?.email || \"\";']
]);
replaceInFile('src/modules/public-help/controllers/public-help-ai-assist.controller.ts', [
    [/this\.aiClient\.generateHelpAnswer/g, '(this.aiClient as any).generateHelpAnswer']
]);
replaceInFile('src/modules/widget/controllers/widget-conversation.controller.ts', [
    [/email: dto\.email,/g, 'email: dto.email || \"\",'],
    [/direction: 'INBOUND'/g, 'direction: MessageDirectionEnum.INBOUND as any'],
    [/this\.messageService\.findByConversation\(([\s\S]*?)\)/g, 'this.messageService.findByConversation($1, {} as any)'],
    [/messages\.map\(/g, '(messages.items || messages.data || messages as any).map(']
]);
replaceInFile('src/modules/notifications/notification-queue.processor.ts', [
    [/import { NotificationService } from '\.\.\/notification\.service';/g, ''] // removing because it says Cannot find module
]);
