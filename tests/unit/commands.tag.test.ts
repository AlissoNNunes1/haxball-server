describe('commands: tags vs avatar', () => {
  it('should call setPlayerTag and not setPlayerAvatar on login', async () => {
    jest.isolateModules(() => {
      // Mock the auth handler used inside commands.cjs
      jest.doMock('../../dist/auth/RoomAuthHandler', () => {
        return {
          RoomAuthHandler: class {
            login() {
              return Promise.resolve({
                success: true,
                account: { ranking: 'S1', haxballNick: 'nick', points: 100, coins: 10 },
              });
            }
          }
        };
      });

      // Import utils and spy on tag functions
      const utils = require('../../shared/config/utils.cjs');
      const tagSpy = jest.spyOn(utils, 'setPlayerTag');

      // Create a fake room with avatar function spy
      const setAvatarSpy = jest.fn();
      const room = {
        name: 'test-room',
        setPlayerAvatar: setAvatarSpy,
        sendAnnouncement: jest.fn(),
        setPlayerAdmin: jest.fn(),
      };

      const { processCommand } = require('../../shared/config/commands.cjs');

      const player = { id: 1, name: 'test' };

      // Call processCommand with login message
      processCommand(room, player, '!login password');

      // Wait for async tasks to finish and then assert
      return new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
        expect(tagSpy).toHaveBeenCalledWith(room, player.id, '[S1]');
        expect(setAvatarSpy).not.toHaveBeenCalled();
        // Verify tag persisted using the earlier imported utils reference
        expect(utils.getPlayerTag(room, player.id)).toBe('[S1]');
        tagSpy.mockRestore();
      });
    });
  });

  it('should clear tag on logout', async () => {
    jest.isolateModules(() => {
      jest.doMock('../../dist/auth/RoomAuthHandler', () => {
        return {
          RoomAuthHandler: class {
            login() {
              return Promise.resolve({ success: true });
            }
            logout() {
              return true;
            }
          }
        };
      });

      const utils = require('../../shared/config/utils.cjs');
      const clearSpy = jest.spyOn(utils, 'clearPlayerTag');

      const room = {
        name: 'test-room',
        setPlayerAvatar: jest.fn(),
        sendAnnouncement: jest.fn(),
      };

      const { processCommand } = require('../../shared/config/commands.cjs');
      const player = { id: 2, name: 'test2' };

      processCommand(room, player, '!logout');

      return new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
        expect(clearSpy).toHaveBeenCalledWith(room, player.id);
        // Verify tag cleared using the earlier imported utils reference
        expect(utils.getPlayerTag(room, player.id)).toBe(null);
        clearSpy.mockRestore();
      });
    });
  });
});
