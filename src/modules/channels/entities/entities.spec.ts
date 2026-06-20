import { Channel, ChannelType } from './channel.entity';
import { ChannelConfiguration } from './channel-configuration.entity';

describe('TypeORM Compatibility Entities', () => {
  it('should instantiate and populate fields', () => {
    const channel = new Channel();
    channel.type = ChannelType.EMAIL;
    channel.isActive = true;
    channel.credentials = { username: 'test' };

    const config = new ChannelConfiguration();
    config.channelId = 'ch-1';
    config.key = 'smtp.host';
    config.value = 'localhost';
    config.isSecret = false;
    config.channel = channel;

    expect(channel).toBeDefined();
    expect(config).toBeDefined();
    expect(channel.type).toBe(ChannelType.EMAIL);
    expect(config.key).toBe('smtp.host');
  });
});
